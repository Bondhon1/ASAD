"use client";

import { useState, useRef } from "react";
import { useMonthlyPaymentStatus } from "@/hooks/useMonthlyPaymentStatus";

/**
 * Shows a premium diamond icon next to the current user's own name on the
 * personal dashboard when they are exempt from monthly donations.
 * Mirrors MonthlyOverdueBadge — one shows for overdue, this one for exempt.
 */
export default function MonthlyExemptDashboardBadge() {
  const { status } = useMonthlyPaymentStatus();
  const [hovered, setHovered] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!status?.exempt) return null;

  const handleEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setHovered(true);
  };
  const handleLeave = () => {
    leaveTimer.current = setTimeout(() => setHovered(false), 200);
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <span className="inline-flex items-center gap-1 cursor-default select-none">
        <svg
          className="w-4 h-4 text-violet-500 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M6.4 2h11.2l4.4 6.2L12 22 2 8.2 6.4 2zm1.2 1.5L4.1 7.5h3.9l1.7-4zm2.5 0-1.7 4h7.2l-1.7-4zm5.3.6 1.9 3.4h3.6zm-13.1 3.9L5.5 20l5-12.5zm2.5 0L11 19l6.5-10.5zm7.5 0L15.5 20l5.2-11.5z" />
        </svg>
      </span>

      {hovered && (
        <div
          className="absolute left-0 top-6 z-50 w-52 bg-white border border-violet-200 rounded-xl shadow-xl p-3"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          <p className="text-xs font-bold text-violet-700 mb-1">Exempt from monthly donations</p>
          {status.exemptReason && (
            <p className="text-xs text-violet-600 bg-violet-50 rounded px-2 py-1">{status.exemptReason}</p>
          )}
        </div>
      )}
    </div>
  );
}
