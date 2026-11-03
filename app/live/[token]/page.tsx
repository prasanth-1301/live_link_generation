"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Hls from "hls.js";

interface SessionData {
  active: boolean;
  childName?: string;
  parentName?: string;
  checkedInAt?: string;
}

function ParentLiveContent() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const videoRef = useRef<HTMLVideoElement>(null);

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [streamError, setStreamError] = useState("");

  useEffect(() => {
    if (!token) return;

    let mounted = true;

    const checkSession = async () => {
      try {
        const response = await fetch(`/api/live/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to verify your session.");
        }

        const data: SessionData = await response.json();

        if (mounted) {
          setSession(data);
          setError("");
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Something went wrong.");
          setLoading(false);
        }
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [token]);

  useEffect(() => {
    if (!session?.active || !videoRef.current) return;

    const video = videoRef.current;
    const playlistUrl = "/api/stream/camera-low-latency/index.m3u8";
    let hls: Hls | null = null;

    setStreamError("");

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = playlistUrl;
      video.play().catch(() => {});
    } else if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        maxBufferLength: 15,
        manifestLoadingMaxRetry: 5,
        levelLoadingMaxRetry: 5,
        fragLoadingMaxRetry: 5,
      });

      hls.loadSource(playlistUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error("IKLO HLS ERROR:", data);

        const responseCode = data.response?.code || "none";
        const responseText = data.response?.text || "";
        const details = [
          data.type,
          data.details,
          "HTTP: " + responseCode,
          responseText
        ].filter(Boolean).join(" | ");

        setStreamError("Video playback error: " + details);

        if (data.fatal) {
          hls?.destroy();
          hls = null;
        }
      });
    } else {
      setStreamError("This browser does not support HLS playback.");
    }

    return () => {
      if (hls) hls.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [session?.active]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <p className="text-gray-600">Verifying your access...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-md w-full">
          <h1 className="text-xl font-semibold text-gray-900">
            Unable to load session
          </h1>
          <p className="text-gray-600 mt-3">{error}</p>
        </div>
      </main>
    );
  }

  if (!session?.active) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-md w-full">
          <div className="text-5xl mb-4">?</div>
          <h1 className="text-2xl font-bold text-gray-900">
            Session Completed
          </h1>
          <p className="text-gray-600 mt-3">
            Your child's live viewing session has ended.
          </p>
          <p className="text-sm text-gray-400 mt-5">
            Thank you for using Iklo.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-green-700">iklo</h1>
            <p className="text-sm text-gray-500">
              Secure Parent Live Viewing
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-green-700">LIVE</span>
          </div>
        </header>

        <section className="bg-white rounded-2xl shadow-sm p-5 mb-5">
          <h2 className="text-xl font-semibold text-gray-900">
            Welcome, {session.parentName || "Parent"}
          </h2>
          <p className="text-gray-600 mt-1">
            Live viewing for {session.childName || "your child"}
          </p>
        </section>

        <section className="bg-black rounded-2xl overflow-hidden shadow-lg">
          <video
            ref={videoRef}
            className="w-full aspect-video"
            controls
            autoPlay
            muted
            playsInline
          />
          {streamError && (
            <p className="p-4 text-center text-red-400">{streamError}</p>
          )}
        </section>

        <p className="text-center text-sm text-gray-500 mt-5">
          This is a private live viewing session. Access is linked
          to your active booking.
        </p>
      </div>
    </main>
  );
}

export default function ParentLivePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-600">Loading live stream...</p>
        </main>
      }
    >
      <ParentLiveContent />
    </Suspense>
  );
}


