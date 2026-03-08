"use client";

import { useState, useRef } from "react";
import MonthlyPaymentSubmitModal from "./MonthlyPaymentSubmitModal";
import MonthlyDelayRequestModal from "./MonthlyDelayRequestModal";
import { useMonthlyPaymentStatus } from "@/hooks/useMonthlyPaymentStatus";

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

interface MonthSummary {
  month: number;
  year: number;
  monthName: string;
  amount: number;
  fine: number;
  deadlineDay: number;
  bkashNumber: string | null;
  nagadNumber: string | null;
  isLate: boolean;
  fineApplies: boolean;
  dueAmount: number;
  isPaid: boolean;
  isPending: boolean;
  isRejected: boolean;
  isUnpaid: boolean;
  payment: Record<string, unknown> | null;
  delayRequest: { status: string; reason: string } | null;
  delayApproved: boolean;
}

interface StatusData {
  today: { month: number; year: number; day: number };
  isDonationMonth: boolean;
  currentMonthSummary: MonthSummary | null;
  unpaidMonths: MonthSummary[];
  unpaidCount: number;
}

export default function MonthlyOverdueBadge() {
  const { status, refresh } = useMonthlyPaymentStatus();
  const [hovered, setHovered] = useState(false);
  const [submitTarget, setSubmitTarget] = useState<MonthSummary | null>(null);
  const [delayTarget, setDelayTarget] = useState<MonthSummary | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!status) return null;

  const { unpaidMonths, unpaidCount, isDonationMonth, currentMonthSummary } = status;

  // Show "Due this month" banner only when the current month is not yet past its deadline.
  // If it's already late, it will appear in unpaidMonths instead — avoid showing it twice.
  const currentDue = isDonationMonth && currentMonthSummary &&
    currentMonthSummary.isUnpaid && !currentMonthSummary.isPending && !currentMonthSummary.isLate;
  if (unpaidCount === 0 && !currentDue) return null;

  // Visual severity: red if anything is overdue, orange if only current month is pending payment
  const isUrgent = unpaidCount > 0;
  const iconColor = isUrgent ? "text-red-500" : "text-orange-400";
  const countBg = isUrgent ? "bg-red-500" : "bg-orange-400";
  const tooltipBorder = isUrgent ? "border-red-200" : "border-orange-200";

  const handleEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setHovered(true);
  };

  const handleLeave = () => {
    leaveTimer.current = setTimeout(() => setHovered(false), 200);
  };

  return (
    <>
      <div
        className="relative inline-flex items-center"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {/* Icon + count badge */}
        <span className="inline-flex items-center gap-1 cursor-default select-none">
          <svg
            className={`w-4 h-4 flex-shrink-0 ${iconColor}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {(unpaidCount + (currentDue ? 1 : 0)) > 1 && (
            <span className={`${countBg} text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none`}>
              {unpaidCount + (currentDue ? 1 : 0)}
            </span>
          )}
        </span>

        {/* Hover tooltip */}
        {hovered && (
          <div
            className={`absolute left-0 top-6 z-50 w-72 bg-white border ${tooltipBorder} rounded-xl shadow-xl p-3`}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            {/* Current donation month (unpaid, before deadline) */}
            {currentDue && currentMonthSummary && (
              <div className="mb-2 bg-orange-50 rounded-lg px-3 py-2">
                <p className="text-xs font-bold text-orange-700 mb-1">Due this month</p>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-gray-800">{currentMonthSummary.monthName} {currentMonthSummary.year}</span>
                    <span className="ml-1.5 text-xs text-orange-600 font-medium">৳{currentMonthSummary.dueAmount}</span>
                    <span className="block text-[11px] text-gray-500">Due by {currentMonthSummary.deadlineDay}{getDaySuffix(currentMonthSummary.deadlineDay)} {currentMonthSummary.monthName}</span>
                  </div>
                </div>
                <button
                  onClick={() => { setHovered(false); setSubmitTarget(currentMonthSummary); }}
                  className="mt-1.5 text-[11px] bg-orange-500 hover:bg-orange-600 text-white px-2 py-0.5 rounded font-semibold transition-colors"
                >
                  Pay Now
                </button>
              </div>
            )}

            {unpaidCount > 0 && (
              <>
                <p className="text-xs font-bold text-red-700 mb-2">
                  {unpaidCount} overdue donation{unpaidCount > 1 ? "s" : ""}
                </p>
                <div className="space-y-2">
                  {unpaidMonths.map((m) => (
                    <div
                      key={`${m.month}-${m.year}`}
                      className="bg-red-50 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-semibold text-gray-800">
                            {m.monthName} {m.year}
                          </span>
                          <span className="ml-1.5 text-xs text-red-600 font-medium">
                            {m.fineApplies
                              ? `৳${m.amount} + ৳${m.fine} fine = ৳${m.dueAmount}`
                              : `৳${m.dueAmount}`}
                          </span>
                          {m.isRejected && (
                            <span className="block text-[11px] text-orange-600">
                              (Rejected — resubmit)
                            </span>
                          )}
                          {m.delayRequest?.status === "PENDING" && (
                            <span className="block text-[11px] text-amber-600">
                              (Delay pending)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {m.delayRequest?.status !== "PENDING" && !m.delayApproved && (
                          <button
                            onClick={() => {
                              setHovered(false);
                              setDelayTarget(m);
                            }}
                            className="text-[11px] text-amber-600 hover:text-amber-700 font-medium underline"
                          >
                            Request delay
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setHovered(false);
                            setSubmitTarget(m);
                          }}
                          className="text-[11px] bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded font-semibold transition-colors"
                        >
                          Pay{m.fineApplies ? " w/ fine" : ""}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Submit modal for non-donation-month direct pay */}
      {submitTarget && (
        <MonthlyPaymentSubmitModal
          month={submitTarget.month}
          year={submitTarget.year}
          baseAmount={submitTarget.amount}
          fine={submitTarget.fine}
          fineApplies={submitTarget.fineApplies}
          isLate={submitTarget.isLate}
          delayApproved={submitTarget.delayApproved}
          bkashNumber={submitTarget.bkashNumber}
          nagadNumber={submitTarget.nagadNumber}
          onClose={() => setSubmitTarget(null)}
          onSuccess={() => {
            setSubmitTarget(null);
            refresh();
          }}
        />
      )}

      {/* Delay request modal */}
      {delayTarget && (
        <MonthlyDelayRequestModal
          month={delayTarget.month}
          year={delayTarget.year}
          onClose={() => setDelayTarget(null)}
          onSuccess={() => {
            setDelayTarget(null);
            refresh();
          }}
        />
      )}
    </>
  );
}
