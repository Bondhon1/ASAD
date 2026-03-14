"use client";

import { useEffect, useState } from "react";
import MonthlyPaymentSubmitModal from "./MonthlyPaymentSubmitModal";
import { MONTH_NAMES, getDonationPeriodLabel } from "@/lib/monthlyPayment";
import { useMonthlyPaymentStatus } from "@/hooks/useMonthlyPaymentStatus";

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

interface MonthlyPaymentStatusData {
  today: { month: number; year: number; day: number };
  isDonationMonth: boolean;
  currentMonthSummary: MonthSummary | null;
  unpaidMonths: MonthSummary[];
  unpaidCount: number;
  monthSummaries: MonthSummary[];
}

export function MonthlyDangerBadge({
  unpaidCount,
  onClick,
}: {
  unpaidCount: number;
  onClick: () => void;
}) {
  if (unpaidCount === 0) return null;
  return (
    <button
      onClick={onClick}
      title={`${unpaidCount} overdue monthly donation${unpaidCount > 1 ? "s" : ""}`}
      className="relative inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold transition-colors shadow-sm"
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {unpaidCount > 1 && <span className="font-mono">{unpaidCount}</span>}
      <span>Overdue donation{unpaidCount > 1 ? "s" : ""}</span>
    </button>
  );
}

export default function MonthlyPaymentWidget() {
  const { status, refresh } = useMonthlyPaymentStatus();
  const loading = status === null;

  // Modal states
  const [submitTarget, setSubmitTarget] = useState<MonthSummary | null>(null);

  // Alert / popup state
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    const today = new Date().toISOString().slice(0, 10);
    return localStorage.getItem("monthly_popup_dismissed") === today;
  });

  const dismissPopup = () => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem("monthly_popup_dismissed", today);
    setPopupDismissed(true);
  };

  if (loading || !status) return null;
  if (status.exempt) return null;

  const { currentMonthSummary, unpaidMonths, unpaidCount, isDonationMonth, today } = status;
  const overdueTotal = unpaidMonths.reduce((s: number, m: MonthSummary) => s + m.dueAmount, 0);
  const combinedTotal = currentMonthSummary ? currentMonthSummary.dueAmount + overdueTotal : overdueTotal;

  // Determine if we should show the inline alert
  // Show if: in a donation month AND before or on deadline AND user hasn't paid/pending
  const showInlineAlert =
    !alertDismissed &&
    isDonationMonth &&
    currentMonthSummary &&
    !currentMonthSummary.isLate &&
    !currentMonthSummary.isPaid &&
    !currentMonthSummary.isPending;

  // Show daily popup if: in donation month AND not paid/pending AND not dismissed today
  const showPopup =
    !popupDismissed &&
    isDonationMonth &&
    currentMonthSummary &&
    !currentMonthSummary.isPaid &&
    !currentMonthSummary.isPending;

  return (
    <>
      {/* ─── Inline alert in dashboard (before deadline) ─── */}
      {showInlineAlert && currentMonthSummary && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-800">
              Monthly donation due by {currentMonthSummary.deadlineDay}{getDaySuffix(currentMonthSummary.deadlineDay)} {getDonationPeriodLabel(currentMonthSummary.month)}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              Amount: <strong>৳{currentMonthSummary.dueAmount}</strong>
              {overdueTotal > 0 && (
                <span className="ml-1 text-orange-600">
                  + ৳{overdueTotal} overdue = <strong>৳{combinedTotal}</strong> total
                </span>
              )}
            </p>
            <button
              onClick={() => setSubmitTarget(currentMonthSummary)}
              className="mt-2 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
            >
              Pay Now
            </button>
          </div>
          
        </div>
      )}



      {/* ─── Daily popup (shown once per day) ─── */}
      {showPopup && currentMonthSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-r from-[#0b2545] to-[#1a3a6b] px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-base">Monthly Donation Reminder</h3>
                <p className="text-blue-200 text-xs mt-0.5">{getDonationPeriodLabel(currentMonthSummary.month)} {currentMonthSummary.year}</p>
              </div>
              <button
                onClick={dismissPopup}
                className="text-white/70 hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5">
              {currentMonthSummary.isLate ? (
                <p className="text-sm text-red-700 font-medium">
                  Your {getDonationPeriodLabel(currentMonthSummary.month)} monthly donation is overdue. A fine of ৳{currentMonthSummary.fine} applies.
                </p>
              ) : (
                <p className="text-sm text-gray-700">
                  Your monthly donation for <strong>{getDonationPeriodLabel(currentMonthSummary.month)}</strong> is due by the <strong>{currentMonthSummary.deadlineDay}{getDaySuffix(currentMonthSummary.deadlineDay)}</strong>.
                </p>
              )}
              <div className={`mt-3 rounded-lg p-3 ${overdueTotal > 0 ? "bg-orange-50" : currentMonthSummary.fineApplies ? "bg-red-50" : "bg-blue-50"}`}>
                {overdueTotal > 0 && (
                  <div className="space-y-0.5 mb-2 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>{getDonationPeriodLabel(currentMonthSummary.month)}</span>
                      <span>৳{currentMonthSummary.dueAmount}</span>
                    </div>
                    {unpaidMonths
                      .filter(m => !(m.month === currentMonthSummary.month && m.year === currentMonthSummary.year))
                      .map(m => (
                      <div key={`${m.month}-${m.year}`} className="flex justify-between text-red-600">
                        <span>{getDonationPeriodLabel(m.month)} <span className="text-[10px]">(overdue)</span></span>
                        <span>৳{m.dueAmount}</span>
                      </div>
                    ))}
                    <div className="border-t border-orange-200 pt-1 mt-1" />
                  </div>
                )}
                <div className="text-center">
                  <span className={`text-2xl font-bold ${overdueTotal > 0 ? "text-orange-700" : currentMonthSummary.fineApplies ? "text-red-700" : "text-[#0b2545]"}`}>
                    ৳{combinedTotal}
                  </span>
                  {overdueTotal > 0 && <p className="text-xs text-orange-600 mt-0.5">Includes {unpaidMonths.length} overdue month{unpaidMonths.length > 1 ? "s" : ""}</p>}
                  {overdueTotal === 0 && currentMonthSummary.fineApplies && (
                    <p className="text-xs text-red-500 mt-0.5">Includes ৳{currentMonthSummary.fine} late fine</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => { dismissPopup(); setSubmitTarget(currentMonthSummary); }}
                  className="flex-1 bg-[#0b2545] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#0d2d54] transition-colors"
                >
                  Pay Now
                </button>
                <button
                  onClick={dismissPopup}
                  className="flex-1 border-2 border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:border-gray-300 transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Submit modal ─── */}
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
          overdueMonths={unpaidMonths}
          onClose={() => setSubmitTarget(null)}
          onSuccess={() => {
            setSubmitTarget(null);
            refresh();
            alert("Payment submitted successfully! It will be reviewed by an admin.");
          }}
        />
      )}

    </>
  );
}

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  const last = day % 10;
  if (last === 1) return "st";
  if (last === 2) return "nd";
  if (last === 3) return "rd";
  return "th";
}
