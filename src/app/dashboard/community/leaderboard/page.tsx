"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Trophy } from "lucide-react";
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
  if (rank === 1) return <span className="text-2xl leading-none">🥇</span>;
  if (rank === 2) return <span className="text-2xl leading-none">🥈</span>;
  if (rank === 3) return <span className="text-2xl leading-none">🥉</span>;
  return (
    <span className="w-8 h-8 flex items-center justify-center text-base font-bold text-slate-400 tabular-nums">
      {rank}
    </span>
  );
}

function UserAvatar({
  user,
  size = 48,
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

export default function LeaderboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("/api/community/leaderboard");
        if (!res.ok) throw new Error("Failed to fetch leaderboard");
        const data = await res.json();
        setEntries(data.leaderboard || []);
        setMonth(data.month || null);
      } catch (error) {
        logErrorToAudit("/api/community/leaderboard", "GET", error instanceof Error ? error : new Error(String(error)));
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const monthLabel = month
    ? new Date(month).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  return (
    <div 
      className="bg-white flex flex-col"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 bg-[#1E3A5F] text-white px-4 flex-shrink-0" style={{ paddingTop: '3.5rem', paddingBottom: '1rem' }}>
        <button 
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-white/10"
        >
          <ArrowLeft size={24} />
        </button>
        <Trophy size={24} />
        <div className="flex-1">
          <h1 className="font-bold text-lg">Monthly Leaderboard</h1>
          <p className="text-sm text-white/80">{monthLabel}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Trophy size={64} className="mb-4 opacity-30" />
            <p className="font-medium text-slate-500">No rankings yet</p>
            <p className="text-sm mt-1">Start posting to earn points!</p>
          </div>
        )}

        {!loading && entries.length > 0 && (
          <div className="space-y-2">
            {entries.map((entry, idx) => {
              const rank = idx + 1;
              const isTop3 = rank <= 3;
              
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    isTop3
                      ? "bg-gradient-to-r from-amber-50 to-amber-100/50 border-amber-200 shadow-sm"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {/* Rank/Medal */}
                  <div className="flex-shrink-0 w-10 flex items-center justify-center">
                    <MedalIcon rank={rank} />
                  </div>

                  {/* Avatar */}
                  <UserAvatar user={entry} size={isTop3 ? 56 : 48} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${isTop3 ? "text-lg text-[#1E3A5F]" : "text-base text-slate-800"}`}>
                      {entry.fullName || "Volunteer"}
                    </p>
                    {entry.volunteerId && (
                      <p className="text-sm text-slate-500 font-mono">#{entry.volunteerId}</p>
                    )}
                  </div>

                  {/* Points */}
                  <div className="flex-shrink-0 text-right">
                    <p className={`font-bold tabular-nums ${isTop3 ? "text-2xl text-amber-600" : "text-xl text-[#1E3A5F]"}`}>
                      {entry.monthlyPoints}
                    </p>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">points</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
