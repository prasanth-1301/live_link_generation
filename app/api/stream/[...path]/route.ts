const UPSTREAM = "http://3.110.182.41:8888";

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const safePath = path.map(segment => encodeURIComponent(decodeURIComponent(segment))).join("/");
    const incomingUrl = new URL(request.url);
    const upstreamUrl = `${UPSTREAM}/${safePath}${incomingUrl.search}`;

    const requestHeaders = new Headers();
    const range = request.headers.get("range");
    if (range) requestHeaders.set("range", range);

    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers: requestHeaders,
      cache: "no-store",
    });

    const headers = new Headers();
    headers.set(
      "Content-Type",
      upstream.headers.get("content-type") || "application/octet-stream"
    );
    headers.set("Cache-Control", "no-store");
    
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) headers.set("Content-Range", contentRange);

    const acceptRanges = upstream.headers.get("accept-ranges");
    if (acceptRanges) headers.set("Accept-Ranges", acceptRanges);

    if (safePath.endsWith(".m3u8")) {
      let playlist = await upstream.text();
      playlist = playlist.replace(
        /https?:\/\/3\.110\.182\.41:8888\//g,
        "/api/stream/"
      );

      return new Response(playlist, {
        status: upstream.status,
        headers,
      });
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    console.error("HLS proxy error:", error);
    return new Response("Unable to reach the live stream.", {
      status: 502,
    });
  }
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}

export async function HEAD(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}
