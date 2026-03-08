"use client";

import { useState } from "react";
import { MONTH_NAMES, getDonationPeriodLabel } from "@/lib/monthlyPayment";

interface MonthlyDelayRequestModalProps {
  month: number;
  year: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MonthlyDelayRequestModal({
  month,
  year,
  onClose,
  onSuccess,
}: MonthlyDelayRequestModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthLabel = `${getDonationPeriodLabel(month)} ${year}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/monthly-payments/delay-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ month, year, reason }),
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
        <div className="bg-amber-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">Request Delay</h2>
            <p className="text-amber-100 text-sm">{monthLabel} monthly donation</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            If your delay request is approved by an admin, you can submit the{" "}
            <strong>{monthLabel}</strong> monthly donation without a late fine.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for delay <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={10}
              maxLength={500}
              rows={4}
              placeholder="Please explain why you need a delay for this month's donation..."
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{reason.length}/500</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting || reason.length < 10}
            className="w-full bg-amber-600 text-white rounded-xl py-3 font-semibold text-sm hover:bg-amber-700 disabled:opacity-60 transition-colors"
          >
            {submitting ? "Submitting..." : "Submit Delay Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
