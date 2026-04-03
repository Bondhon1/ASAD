"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Capacitor } from "@capacitor/core";
import { StatusBar } from "@capacitor/status-bar";
import { X, Trophy, Medal, Award, Crown } from "lucide-react";
import Image from "next/image";

interface LeaderboardEntry {
  id: number;
  name: string;
  rank: number;
  profilePicture: string | null;
  totalPoints: number;
  level: string;
}

interface NativeLeaderboardProps {
  onClose: () => void;
}

export default function NativeLeaderboard({ onClose }: NativeLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch("/api/community/leaderboard");
      if (!response.ok) throw new Error("Failed to fetch leaderboard");

      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
      setMonth(data.month || null);
    } catch (error) {
      console.error("Leaderboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={24} color="#FFD700" />;
    if (rank === 2) return <Medal size={24} color="#C0C0C0" />;
    if (rank === 3) return <Award size={24} color="#CD7F32" />;
    return null;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "#FFD700";
    if (rank === 2) return "#C0C0C0";
    if (rank === 3) return "#CD7F32";
    return "#64748b";
  };

  if (!isMounted) return null;

  const leaderboardContent = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#f8fafc",
        zIndex: 99999,
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          left: 0,
          right: 0,
          height: "56px",
          backgroundColor: "#1e40af",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Trophy size={24} color="#fff" />
          <div>
            <h2 style={{ color: "#fff", fontSize: "18px", fontWeight: 600, margin: 0 }}>
              Leaderboard
            </h2>
            {month && (
              <p style={{ color: "#93c5fd", fontSize: "12px", margin: 0 }}>
                {month}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={24} color="#fff" />
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          height: "calc(100% - 56px)",
          overflowY: "auto",
          padding: "16px",
        }}
      >
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "200px",
            }}
          >
            <div style={{ color: "#64748b", fontSize: "16px" }}>Loading...</div>
          </div>
        ) : leaderboard.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              height: "200px",
              gap: "12px",
            }}
          >
            <Trophy size={48} color="#cbd5e1" />
            <div style={{ color: "#64748b", fontSize: "16px", textAlign: "center" }}>
              No leaderboard data available
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {leaderboard.map((entry) => (
              <div
                key={entry.id}
                style={{
                  backgroundColor: entry.rank <= 3 ? "#fff" : "#fff",
                  border: entry.rank <= 3 ? `2px solid ${getRankColor(entry.rank)}` : "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  boxShadow: entry.rank <= 3 ? "0 4px 12px rgba(0,0,0,0.1)" : "0 2px 4px rgba(0,0,0,0.05)",
                }}
              >
                {/* Rank */}
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: entry.rank <= 3 ? getRankColor(entry.rank) : "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "18px",
                    color: entry.rank <= 3 ? "#fff" : "#64748b",
                    flexShrink: 0,
                  }}
                >
                  {entry.rank <= 3 ? getRankIcon(entry.rank) : entry.rank}
                </div>

                {/* Profile Picture */}
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    backgroundColor: "#e2e8f0",
                    flexShrink: 0,
                    position: "relative",
                  }}
                >
                  {entry.profilePicture ? (
                    <Image
                      src={entry.profilePicture}
                      alt={entry.name}
                      fill
                      style={{ objectFit: "cover" }}
                      unoptimized
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "20px",
                        fontWeight: 600,
                        color: "#64748b",
                      }}
                    >
                      {entry.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#1e293b",
                      margin: 0,
                      marginBottom: "4px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.name}
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#64748b",
                      margin: 0,
                    }}
                  >
                    {entry.level}
                  </p>
                </div>

                {/* Points */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "4px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: entry.rank <= 3 ? getRankColor(entry.rank) : "#1e293b",
                    }}
                  >
                    {entry.totalPoints}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                    }}
                  >
                    points
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(leaderboardContent, document.body);
}
