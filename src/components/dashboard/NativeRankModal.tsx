"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Capacitor } from "@capacitor/core";
import { StatusBar } from "@capacitor/status-bar";
import { X, Trophy, Star, Award } from "lucide-react";

interface RankModalProps {
  onClose: () => void;
  pointsData: {
    currentPoints: number;
    currentRankName: string | null;
    currentRankThreshold: number;
    nextRankName: string | null;
    nextRankThreshold: number | null;
    rankSequence: Array<{ name: string; thresholdPoints: number }>;
  } | null;
  loading: boolean;
}

export default function NativeRankModal({ onClose, pointsData, loading }: RankModalProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Hide status bar on native for full immersion
    if (Capacitor.isNativePlatform()) {
      StatusBar.hide().catch(() => {});
    }

    return () => {
      if (Capacitor.isNativePlatform()) {
        StatusBar.show().catch(() => {});
      }
    };
  }, []);

  if (!isMounted) return null;

  const cp = pointsData?.currentPoints ?? 0;
  const threshold = pointsData?.currentRankThreshold ?? 0;
  const nextRank = pointsData?.nextRankName ?? null;
  const nextThreshold = pointsData?.nextRankThreshold ?? null;
  const progressPct = threshold > 0 ? Math.min(100, Math.round((cp / threshold) * 100)) : (nextRank ? 0 : 100);
  const rankSeq = pointsData?.rankSequence ?? [];
  const currentRankName = pointsData?.currentRankName ?? 'VOLUNTEER';

  const inspiringMessage = (() => {
    if (!nextRank) return "You've reached the pinnacle of leadership. Your journey is an inspiration to every volunteer in the community!";
    if (progressPct >= 100) return "You've hit the threshold — a new rank is on its way! Your incredible effort is about to be rewarded.";
    if (progressPct >= 90) return "Almost there! One final push and you'll claim your next rank. The community is cheering for you!";
    if (progressPct >= 75) return "You're in the home stretch! Your unwavering dedication is setting an example for everyone around you.";
    if (progressPct >= 55) return "Over halfway! Your commitment to the community is making a real, lasting difference.";
    if (progressPct >= 35) return "Great momentum! Every task you complete inches you closer to greatness.";
    if (progressPct >= 15) return "You're building something real. Keep showing up — the community grows stronger with every contribution you make.";
    return "Every great journey starts with a single step. Your dedication, no matter how small, lights the way for others.";
  })();

  const currentSeqIdx = rankSeq.findIndex(r => r.name.trim().toLowerCase() === (currentRankName ?? '').trim().toLowerCase());

  const modalContent = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#ffffff",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        paddingTop: Capacitor.isNativePlatform() ? "env(safe-area-inset-top, 0px)" : 0,
        paddingBottom: Capacitor.isNativePlatform() ? "env(safe-area-inset-bottom, 0px)" : 0,
      }}
    >
      {/* Header - Fixed height */}
      <div
        style={{
          position: "sticky",
          top: 0,
          left: 0,
          right: 0,
          height: "56px",
          background: "linear-gradient(90deg, #0b2545 0%, #07223f 100%)",
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
          <h2 style={{ color: "#fff", fontSize: "18px", fontWeight: 600, margin: 0 }}>
            Rank Status
          </h2>
        </div>
        <button
          onClick={onClose}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background-color 0.2s",
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
          }}
        >
          <X size={20} color="#fff" />
        </button>
      </div>

      {/* Content - Scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{ padding: "24px 16px" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: "48px", gap: "12px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  border: "2px solid #0b2545",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              <span style={{ fontSize: "14px", color: "#64748b" }}>Loading rank data…</span>
            </div>
          ) : (
            <>
              {/* Current rank badge */}
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 20px",
                    backgroundColor: "#0b2545",
                    color: "#fff",
                    borderRadius: "9999px",
                    fontSize: "14px",
                    fontWeight: 600,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  <Star size={14} fill="#fff" />
                  {currentRankName}
                </div>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  borderRadius: "12px",
                  padding: "16px",
                  border: "1px solid #e2e8f0",
                  marginBottom: "20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Progress to next rank
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#0b2545" }}>
                    {progressPct}%
                  </span>
                </div>
                <div style={{ width: "100%", backgroundColor: "#e2e8f0", borderRadius: "9999px", height: "12px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "12px",
                      borderRadius: "9999px",
                      width: `${progressPct}%`,
                      background: progressPct >= 100
                        ? "linear-gradient(90deg, #059669, #10b981)"
                        : progressPct >= 75
                        ? "linear-gradient(90deg, #1e40af, #3b82f6)"
                        : "linear-gradient(90deg, #0b2545, #1e4d8c)",
                      transition: "width 0.7s ease",
                    }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    {cp} pts earned
                  </span>
                  {nextRank ? (
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      {threshold} pts needed → <span style={{ fontWeight: 500, color: "#334155" }}>{nextRank}</span>
                    </span>
                  ) : (
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "#059669" }}>
                      Top rank achieved 🎉
                    </span>
                  )}
                </div>
              </div>

              {/* Inspiring message */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "16px",
                  backgroundColor: "#eff6ff",
                  border: "1px solid #dbeafe",
                  borderRadius: "12px",
                  marginBottom: "24px",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginTop: "2px", flexShrink: 0 }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <p style={{ fontSize: "14px", color: "#1e3a8a", lineHeight: "1.6", fontStyle: "italic", margin: 0 }}>
                  {inspiringMessage}
                </p>
              </div>

              {/* Rank ladder */}
              {rankSeq.length > 0 && (
                <div>
                  <h4 style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
                    Rank Progression
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "300px", overflowY: "auto", paddingRight: "4px" }}>
                    {rankSeq.map((r, idx) => {
                      const isCompleted = currentSeqIdx >= 0 && idx < currentSeqIdx;
                      const isCurrent = idx === currentSeqIdx;
                      const isNext = idx === currentSeqIdx + 1;
                      return (
                        <div
                          key={r.name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            backgroundColor: isCurrent
                              ? "#0b2545"
                              : isCompleted
                              ? "#ecfdf5"
                              : isNext
                              ? "#eff6ff"
                              : "#ffffff",
                            color: isCurrent
                              ? "#ffffff"
                              : isCompleted
                              ? "#059669"
                              : isNext
                              ? "#1e40af"
                              : "#94a3b8",
                            border: isNext ? "1px solid #dbeafe" : "none",
                          }}
                        >
                          <div
                            style={{
                              flexShrink: 0,
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "10px",
                              fontWeight: 700,
                              backgroundColor: isCurrent
                                ? "rgba(255, 255, 255, 0.2)"
                                : isCompleted
                                ? "#d1fae5"
                                : "#f1f5f9",
                              color: isCurrent
                                ? "#ffffff"
                                : isCompleted
                                ? "#059669"
                                : "#94a3b8",
                            }}
                          >
                            {isCompleted ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : (
                              idx + 1
                            )}
                          </div>
                          <span style={{ flex: 1, fontSize: "12px", fontWeight: 500 }}>
                            {r.name}
                          </span>
                          {isCurrent && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 600,
                                backgroundColor: "rgba(255, 255, 255, 0.2)",
                                padding: "2px 8px",
                                borderRadius: "9999px",
                              }}
                            >
                              Current
                            </span>
                          )}
                          <span style={{ fontSize: "11px", color: isCurrent || isCompleted ? "inherit" : "#94a3b8" }}>
                            {r.thresholdPoints} pts
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
}
