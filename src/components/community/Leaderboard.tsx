"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { logErrorToAudit } from "@/lib/apiErrorHandler";

interface LeaderboardEntry {
  id: string;
  fullName: string | null;
  volunteerId: string | null;
  profilePicUrl: string | null;
  role: string;
  monthlyPoints: number;
  totalPoints: number;
}

function MedalIcon({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="text-lg leading-none" title="1st Place">
        🥇
      </span>
    );
  if (rank === 2)
    return (
      <span className="text-lg leading-none" title="2nd Place">
        🥈
      </span>
    );
  if (rank === 3)
    return (
      <span className="text-lg leading-none" title="3rd Place">
        🥉
      </span>
    );
  return (
    <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-400 tabular-nums">
      {rank}
    </span>
  );
}

function UserAvatar({
  user,
  size = 32,
}: {
  user: Pick<LeaderboardEntry, "id" | "fullName" | "profilePicUrl">;
  size?: number;
}) {
  const initials = (user.fullName || "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (user.profilePicUrl) {
    return (
      <Image
        src={user.profilePicUrl}
        alt={user.fullName || "user"}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-[#1E3A5F] text-white flex items-center justify-center flex-shrink-0 font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

function LeaderboardList({
  entries,
  loading,
  month,
}: {
  entries: LeaderboardEntry[];
  loading: boolean;
  month: string | null;
}) {
  const monthLabel = month
    ? new Date(month).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#d97706"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 leading-tight">Leaderboard</h2>
          {monthLabel && (
            <p className="text-xs text-slate-400 leading-tight">{monthLabel}</p>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2.5 py-2 animate-pulse">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex-shrink-0" />
              <div className="w-9 h-9 rounded-full bg-slate-200 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                <div className="h-2.5 bg-slate-100 rounded w-1/2" />
              </div>
              <div className="h-6 w-14 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <ol className="space-y-1">
          {entries.map((entry, idx) => {
            const rank = idx + 1;
            const isTop3 = rank <= 3;
            const hasMonthlyPoints = entry.monthlyPoints > 0;
            return (
              <li
                key={entry.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                  rank === 1
                    ? "bg-amber-50/70 border border-amber-100"
                    : rank === 2
                    ? "bg-slate-50/80 border border-slate-100"
                    : rank === 3
                    ? "bg-orange-50/50 border border-orange-100"
                    : "border border-transparent hover:bg-slate-50"
                }`}
              >
                {/* Rank */}
                <div className="w-6 flex items-center justify-center flex-shrink-0">
                  <MedalIcon rank={rank} />
                </div>

                {/* Avatar */}
                <UserAvatar user={entry} size={34} />

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold truncate leading-tight ${
                      isTop3 ? "text-slate-800" : "text-slate-700"
                    }`}
                  >
                    {entry.fullName || "Unknown"}
                  </p>
                  {entry.volunteerId && (
                    <p className="text-[11px] text-slate-400 leading-tight truncate">
                      {entry.volunteerId}
                    </p>
                  )}
                </div>

                {/* Points badge */}
                <div className="flex flex-col items-end flex-shrink-0">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      !hasMonthlyPoints
                        ? "bg-slate-100 text-slate-400"
                        : rank === 1
                        ? "bg-amber-100 text-amber-700"
                        : rank === 2
                        ? "bg-slate-200 text-slate-600"
                        : rank === 3
                        ? "bg-orange-100 text-orange-600"
                        : "bg-[#1E3A5F]/10 text-[#1E3A5F]"
                    }`}
                  >
                    {hasMonthlyPoints ? `${entry.monthlyPoints} pts` : "0"}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <p className="mt-3 text-center text-[10px] text-slate-400">
        Monthly points reset at the start of each month
      </p>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function CommunityLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [month, setMonth] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/community/leaderboard", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.leaderboard || []);
        setMonth(data.month || null);
      } else {
        console.error(`[Leaderboard] Failed to fetch: ${res.status}`, res.statusText);
        await logErrorToAudit(
          "/api/community/leaderboard",
          "GET",
          `Failed to fetch leaderboard: ${res.status} ${res.statusText}`
        );
      }
    } catch (err) {
      console.error("[Leaderboard] Error:", err instanceof Error ? err.message : err);
      await logErrorToAudit(
        "/api/community/leaderboard",
        "GET",
        err instanceof Error ? err : String(err)
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchLeaderboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchLeaderboard]);

  // Close drawer on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      {/* ── Desktop sidebar panel (visible lg+) ─────────────────────────── */}
      <aside className="hidden lg:block w-80 xl:w-96 flex-shrink-0">
        <div className="sticky top-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <LeaderboardList entries={entries} loading={loading} month={month} />
        </div>
      </aside>

      {/* ── Mobile floating trophy button (hidden lg+) ───────────────────── */}
      <div className="lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open leaderboard"
          className="fixed bottom-6 right-4 z-30 w-13 h-13 flex items-center justify-center bg-[#0b2545] text-white rounded-full shadow-lg hover:bg-[#0d2d5a] active:scale-95 transition-all"
          style={{ width: 52, height: 52 }}
        >
          {/* Trophy icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
          {/* Notification dot for top 3 excitement */}
          {!loading && entries.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-white text-[9px] font-bold text-white flex items-center justify-center">
              {entries.length}
            </span>
          )}
        </button>

        {/* Backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Bottom sheet drawer */}
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-y-0" : "translate-y-full"
          }`}
          style={{ maxHeight: "80vh", overflowY: "auto" }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-slate-200" />
          </div>

          {/* Close button */}
          <div className="flex items-center justify-between px-4 pt-1 pb-2">
            <span className="text-sm font-semibold text-slate-700">Monthly Leaderboard</span>
            <button
              onClick={() => setMobileOpen(false)}
              className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-4 pb-8">
            <LeaderboardList entries={entries} loading={loading} month={month} />
          </div>
        </div>
      </div>
    </>
  );
}
