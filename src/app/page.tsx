
"use client";

import { useCallback, useEffect, useState } from "react";

type Session = {
  id: string;
  child_name: string;
  parent_name: string;
  parent_email: string;
  access_token: string;
  checked_in_at: string;
};

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [childName, setChildName] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");

  const loadSessions = useCallback(async () => {
    try {
      const response = await fetch("/api/sessions", { cache: "no-store" });
      const result = await response.json();
      if (response.ok) setSessions(result.sessions || []);
    } catch {
      setMessage("Unable to load active sessions.");
    }
  }, []);

  useEffect(() => {
    loadSessions();
    const timer = setInterval(loadSessions, 5000);
    return () => clearInterval(timer);
  }, [loadSessions]);

  async function checkIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setGeneratedLink("");

    try {
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childName, parentName, parentEmail }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Check-in failed");

      setGeneratedLink(result.liveLink || "");
      setMessage(
        result.emailSent
          ? "Check-in successful. Email sent to parent."
          : "Check-in successful, but email was not confirmed."
      );

      setChildName("");
      setParentName("");
      setParentEmail("");
      await loadSessions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Check-in failed");
    } finally {
      setLoading(false);
    }
  }

  async function checkout(id: string) {
    if (!confirm("Check out this child?")) return;

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Checkout failed");

      setMessage("Session completed successfully.");
      await loadSessions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout failed");
    }
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Temporary parent link copied.");
    } catch {
      setMessage("Unable to copy link.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f8f6] text-[#20352b]">
      <header className="border-b border-[#e6eee9] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#00a878]">
              iklo
            </h1>
            <p className="text-xs text-gray-500">Childcare management</p>
          </div>
          <div className="rounded-xl bg-[#e5f7ef] px-4 py-2 text-center">
            <p className="text-xs font-semibold text-[#16865d]">ACTIVE SESSIONS</p>
            <p className="text-xl font-bold text-[#087b4b]">{sessions.length} / 18</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-7">
        <div className="mb-7">
          <h2 className="text-2xl font-bold">Child Check-in</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage check-ins and secure parent live viewing.
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-[#d5eadf] bg-white p-4 text-sm">
            {message}
          </div>
        )}

        {generatedLink && (
          <div className="mb-6 rounded-xl border border-[#bce8d1] bg-[#eaf8f0] p-5">
            <h3 className="font-bold text-[#087b4b]">
              Temporary parent link generated
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              This link is unique to the current check-in session.
            </p>
            <button
              onClick={() => copyLink(generatedLink)}
              className="mt-3 rounded-lg bg-[#00a878] px-5 py-3 text-sm font-bold text-white hover:bg-[#008f65]"
            >
              Copy temporary link
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <section className="rounded-2xl border border-[#e4ebe6] bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#00a878]">
                New session
              </p>
              <h3 className="mt-1 text-xl font-bold">New check-in</h3>
            </div>

            <form onSubmit={checkIn} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Child name</label>
                <input
                  required
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="Enter child name"
                  className="w-full rounded-xl border border-gray-200 bg-[#fafcfb] px-4 py-3 outline-none focus:border-[#00a878]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Parent name</label>
                <input
                  required
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="Enter parent name"
                  className="w-full rounded-xl border border-gray-200 bg-[#fafcfb] px-4 py-3 outline-none focus:border-[#00a878]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Parent email</label>
                <input
                  required
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="w-full rounded-xl border border-gray-200 bg-[#fafcfb] px-4 py-3 outline-none focus:border-[#00a878]"
                />
              </div>

              <button
                disabled={loading || sessions.length >= 18}
                className="w-full rounded-xl bg-[#00a878] px-4 py-3 font-bold text-white hover:bg-[#008f65] disabled:opacity-50"
              >
                {loading ? "Processing..." : "Check In & Send Parent Link"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-[#e4ebe6] bg-white p-6 shadow-sm lg:col-span-3">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#00a878]">
                  Active bookings
                </p>
                <h3 className="mt-1 text-xl font-bold">Currently checked in</h3>
              </div>
              <button
                onClick={loadSessions}
                className="text-sm font-semibold text-[#00a878]"
              >
                Refresh
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
                <p className="text-3xl">👶</p>
                <p className="mt-3 font-semibold">No children currently checked in</p>
                <p className="mt-1 text-sm text-gray-500">
                  New check-ins will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-xl border border-[#e5eee8] p-4"
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-bold">{session.child_name}</h4>
                        <p className="mt-1 text-sm text-gray-600">
                          Parent: {session.parent_name}
                        </p>
                        <p className="text-sm text-gray-500">{session.parent_email}</p>
                        <p className="mt-2 text-xs text-gray-400">
                          Checked in: {new Date(session.checked_in_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="h-fit rounded-full bg-[#e5f7ef] px-3 py-1 text-xs font-bold text-[#16865d]">
                        CHECKED IN
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          copyLink(
                            `${window.location.origin}/live/${session.access_token}`
                          )
                        }
                        className="rounded-lg bg-[#00a878] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#008f65]"
                      >
                        Copy temporary link
                      </button>
                      <button
                        onClick={() => checkout(session.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100"
                      >
                        Check Out
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <footer className="mt-10 text-center text-xs text-gray-400">
          iklo · Secure childcare experience
        </footer>
      </div>
    </main>
  );
}
