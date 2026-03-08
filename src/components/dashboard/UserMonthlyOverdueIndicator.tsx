"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface UserMonthlyOverdueIndicatorProps {
  userId: string;
  /** Pre-computed count from parent list fetch — skips the automatic mount fetch */
  overdueCount?: number;
  className?: string;
}

interface OverdueData {
  unpaidCount: number;
  unpaidMonths: Array<{ month: number; year: number; monthName: string }>;
}

/**
 * Shows a danger icon next to a user's name if they have overdue monthly donations.
 * Hover reveals a tooltip listing the overdue months.
 *
 * When `overdueCount` is provided by the parent (e.g. from the bulk user list),
 * the component renders immediately without an API call. The detail (month list)
 * is fetched lazily on first hover. Without `overdueCount`, falls back to an
 * automatic fetch on mount (used by the profile page).
 */
export default function UserMonthlyOverdueIndicator({
  userId,
  overdueCount,
  className = "",
}: UserMonthlyOverdueIndicatorProps) {
  const [data, setData] = useState<OverdueData | null>(null);
  const [hovered, setHovered] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchedRef = useRef(false);

  // Auto-fetch on mount ONLY when parent has not supplied overdueCount (profile page fallback)
  useEffect(() => {
    if (overdueCount !== undefined) return;
    if (!userId) return;
    fetch(`/api/admin/monthly-payments/user-status/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {});
  }, [userId, overdueCount]);

  // Lazy-loads month detail on first hover (when parent supplied a count but not the full list)
  const fetchDetail = useCallback(() => {
    if (fetchedRef.current || data) return;
    fetchedRef.current = true;
    fetch(`/api/admin/monthly-payments/user-status/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {});
  }, [userId, data]);

  const handleEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setHovered(true);
    fetchDetail();
  };
  const handleLeave = () => {
    leaveTimer.current = setTimeout(() => setHovered(false), 200);
  };

  const count = data?.unpaidCount ?? overdueCount ?? 0;
  if (count === 0) return null;

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <span className="inline-flex items-center gap-1 cursor-default select-none">
        <svg
          className="w-4 h-4 text-red-500 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        {count > 1 && (
          <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
            {count}
          </span>
        )}
      </span>

      {hovered && (
        <div
          className="absolute left-0 top-6 z-50 w-56 bg-white border border-red-200 rounded-xl shadow-xl p-3"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          {data ? (
            <>
              <p className="text-xs font-bold text-red-700 mb-1.5">
                {data.unpaidCount} overdue donation{data.unpaidCount > 1 ? "s" : ""}
              </p>
              <div className="space-y-1">
                {data.unpaidMonths.map(m => (
                  <div key={`${m.month}-${m.year}`} className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                    {m.monthName} {m.year}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-red-400">Loading…</p>
          )}
        </div>
      )}
    </div>
  );
}
