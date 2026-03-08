"use client";

import { useState } from "react";
import { MONTH_NAMES, getDonationPeriodLabel } from "@/lib/monthlyPayment";

interface OverdueMonth {
  month: number;
  year: number;
  monthName: string;
  amount: number;
  fine: number;
  dueAmount: number;
  fineApplies: boolean;
}

interface MonthlyPaymentSubmitModalProps {
  month: number;
  year: number;
  baseAmount: number;
  fine: number;
  fineApplies: boolean;
  isLate: boolean;
  delayApproved: boolean;
  bkashNumber?: string | null;
  nagadNumber?: string | null;
  overdueMonths?: OverdueMonth[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function MonthlyPaymentSubmitModal({
  month,
  year,
  baseAmount,
  fine,
  fineApplies,
  isLate,
  delayApproved,
  bkashNumber,
  nagadNumber,
  overdueMonths = [],
  onClose,
  onSuccess,
}: MonthlyPaymentSubmitModalProps) {
  const [senderNumber, setSenderNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"bkash" | "nagad">("bkash");
  const [trxId, setTrxId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentMonthAmount = fineApplies ? baseAmount + fine : baseAmount;
  const overdueTotal = overdueMonths.reduce((s, m) => s + m.dueAmount, 0);
  const totalAmount = currentMonthAmount + overdueTotal;
  const monthLabel = `${getDonationPeriodLabel(month)} ${year}`;
  const recipientNumber = paymentMethod === "bkash" ? bkashNumber : nagadNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/monthly-payments/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ month, year, senderNumber, paymentMethod, trxId, coveredMonths: overdueMonths.map(m => ({ month: m.month, year: m.year })) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Submission failed");
        return;
      }
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-[#0b2545] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">Monthly Donation</h2>
            <p className="text-blue-200 text-sm">{monthLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Amount summary */}
          <div className={`rounded-xl p-4 ${overdueMonths.length > 0 ? "bg-orange-50 border border-orange-200" : fineApplies ? "bg-red-50 border border-red-200" : "bg-blue-50 border border-blue-200"}`}>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{monthLabel}</p>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Base amount</span>
              <span className="font-semibold">৳{baseAmount}</span>
            </div>
            {fineApplies && (
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-red-600 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Late fine
                </span>
                <span className="font-semibold text-red-600">+৳{fine}</span>
              </div>
            )}
            {isLate && delayApproved && (
              <p className="text-green-600 text-xs mt-1 font-medium">✓ Delay approved — fine waived</p>
            )}
            {overdueMonths.length > 0 && (
              <>
                <div className="border-t border-orange-200 mt-3 mb-2" />
                <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wide mb-1.5">Overdue months included</p>
                {overdueMonths.map((m) => (
                  <div key={`${m.month}-${m.year}`} className="flex justify-between items-center text-sm mt-1">
                    <span className="text-gray-700">
                      {getDonationPeriodLabel(m.month)} {m.year}
                      {m.fineApplies && <span className="text-xs text-red-500 ml-1">(+৳{m.fine} fine)</span>}
                    </span>
                    <span className="font-semibold text-red-600">৳{m.dueAmount}</span>
                  </div>
                ))}
              </>
            )}
            <div className={`flex justify-between items-center mt-3 pt-2 border-t ${overdueMonths.length > 0 ? "border-orange-200" : fineApplies ? "border-red-200" : "border-blue-200"}`}>
              <span className="font-bold text-gray-800">Total due</span>
              <span className={`font-bold text-lg ${overdueMonths.length > 0 ? "text-orange-700" : fineApplies ? "text-red-600" : "text-[#0b2545]"}`}>৳{totalAmount}</span>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <div className="grid grid-cols-2 gap-3">
              {(["bkash", "nagad"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2.5 rounded-lg border-2 font-semibold text-sm capitalize transition-all ${
                    paymentMethod === method
                      ? "border-[#0b2545] bg-[#0b2545] text-white"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {method === "bkash" ? "bKash" : "Nagad"}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient number */}
          {recipientNumber && (
            <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between text-sm">
              <span className="text-gray-500">Send money to ({paymentMethod === "bkash" ? "bKash" : "Nagad"})</span>
              <span className="font-mono font-bold text-gray-800 text-base">{recipientNumber}</span>
            </div>
          )}

          {/* Sender number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Number</label>
            <input
              type="tel"
              value={senderNumber}
              onChange={(e) => setSenderNumber(e.target.value)}
              placeholder="01XXXXXXXXX"
              required
              pattern="^01[3-9]\d{8}$"
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0b2545] transition-colors"
            />
          </div>

          {/* Transaction ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID (TrxID)</label>
            <input
              type="text"
              value={trxId}
              onChange={(e) => setTrxId(e.target.value)}
              placeholder="e.g. AB1234567890"
              required
              minLength={4}
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0b2545] transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#0b2545] text-white rounded-xl py-3 font-semibold text-sm hover:bg-[#0d2d54] disabled:opacity-60 transition-colors"
          >
            {submitting ? "Submitting..." : `Submit Payment — ৳${totalAmount}`}
          </button>
        </form>
      </div>
    </div>
  );
}
