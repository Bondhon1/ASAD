"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";
import React from "react";
import { useModal } from "@/components/ui/ModalProvider";

// ─── Volunteer ID chip input ────────────────────────────────────────────────

function VolunteerIDChipInput({
  volunteerIds,
  onChange,
}: {
  volunteerIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isValid = (id: string) => /^\d+$/.test(id.trim()) && id.trim().length > 0;

  const addIds = (value: string) => {
    const entries = value
      .split(/[,\s\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const valid: string[] = [];
    const invalid: string[] = [];
    entries.forEach((e) => {
      if (isValid(e)) {
        if (!volunteerIds.includes(e) && !valid.includes(e)) valid.push(e);
      } else {
        invalid.push(e);
      }
    });
    if (invalid.length) {
      setWarning(`Invalid ID(s): ${invalid.join(", ")}. Only numeric IDs accepted.`);
      setTimeout(() => setWarning(null), 4000);
    } else {
      setWarning(null);
    }
    if (valid.length) onChange([...volunteerIds, ...valid]);
    setInputValue("");
  };

  return (
    <div>
      <div
        className="min-h-[110px] p-3 border-2 border-slate-300 rounded-lg bg-white hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex flex-wrap gap-2 mb-2">
          {volunteerIds.map((id, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-1 bg-[#0b2545] text-white rounded text-xs font-medium"
            >
              <span className="font-mono">{id}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(volunteerIds.filter((v) => v !== id));
                }}
                className="ml-0.5 hover:bg-white/20 rounded p-0.5 transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </span>
          ))}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              if (inputValue.trim()) addIds(inputValue);
            } else if (e.key === "Backspace" && inputValue === "" && volunteerIds.length > 0) {
              onChange(volunteerIds.slice(0, -1));
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            addIds(e.clipboardData.getData("text"));
          }}
          onBlur={() => { if (inputValue.trim()) addIds(inputValue); }}
          className="w-full outline-none bg-transparent text-sm"
          placeholder={volunteerIds.length === 0 ? "Type volunteer IDs (numeric) — press Enter or , to add…" : "Add more IDs…"}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
        <span>
          Press{" "}
          <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-xs">Enter</kbd>{" "}
          or{" "}
          <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-xs">,</kbd>{" "}
          to add
        </span>
        <span className="font-semibold text-blue-600">
          {volunteerIds.length} ID{volunteerIds.length !== 1 ? "s" : ""} added
        </span>
      </div>
      {warning && (
        <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          {warning}
        </div>
      )}
    </div>
  );
}

// ─── Results modal after manual update ─────────────────────────────────────

type UpdateResult = {
  ident: string;
  ok: boolean;
  error?: string;
  newCredits?: number;
  change?: number;
};

function ResultsModal({ results, onClose }: { results: UpdateResult[]; onClose: () => void }) {
  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.length - successCount;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Credit Update Results</h2>
            <p className="text-sm text-slate-600">
              <span className="text-green-600 font-semibold">{successCount} succeeded</span> ·{" "}
              <span className="text-red-600 font-semibold">{failCount} failed</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-lg transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(80vh-130px)] p-5 space-y-2">
          {results.map((r, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border text-sm flex items-start justify-between ${
                r.ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
              }`}
            >
              <div>
                <span className="font-mono font-semibold">{r.ident}</span>
                {r.ok ? (
                  <div className="text-xs text-green-700 mt-0.5">
                    Change: {(r.change ?? 0) > 0 ? "+" : ""}{r.change ?? 0} · New total:{" "}
                    {r.newCredits?.toLocaleString()} credits
                  </div>
                ) : (
                  <div className="text-xs text-red-700 mt-0.5">{r.error}</div>
                )}
              </div>
              <span className={`text-xs font-semibold ${r.ok ? "text-green-600" : "text-red-600"}`}>
                {r.ok ? "✓" : "✗"}
              </span>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pay modal (admin confirms and marks paid) ──────────────────────────────

type Payout = {
  id: string;
  credits: number;
  bdtAmount: number;
  bkashNumber?: string | null;
  paymentMethod?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  processedAt?: string | null;
  user: {
    id: string;
    fullName?: string | null;
    username?: string | null;
    email?: string | null;
    phone?: string | null;
    volunteerId?: string | null;
    credits: number;
  };
  processedBy?: { fullName?: string | null; username?: string | null } | null;
};

function PayModal({
  payout,
  onClose,
  onConfirm,
  processing,
}: {
  payout: Payout;
  onClose: () => void;
  onConfirm: (confirmedBkash: string, confirmedBDT: number) => void;
  processing: boolean;
}) {
  const [confirmBkash, setConfirmBkash] = useState(payout.bkashNumber ?? "");
  const [confirmBDT, setConfirmBDT] = useState(String(payout.bdtAmount ?? ""));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Confirm Payout</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-white rounded-lg transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review details then send the payment manually via bKash before marking as paid.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* User info */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="font-semibold text-slate-800">
              {payout.user.fullName || payout.user.username}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{payout.user.email}</div>
            {payout.user.volunteerId && (
              <div className="text-xs font-mono text-slate-600 mt-0.5">
                Volunteer ID: {payout.user.volunteerId}
              </div>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">Registered bKash:</span>{" "}
                <span className="font-semibold">{payout.bkashNumber || "—"}</span>
              </div>
              <div>
                <span className="text-slate-500">Credits to deduct:</span>{" "}
                <span className="font-semibold">{payout.credits?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Confirm bKash */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Confirm bKash Number
            </label>
            <input
              type="text"
              value={confirmBkash}
              onChange={(e) => setConfirmBkash(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
              placeholder="01XXXXXXXXX"
            />
          </div>

          {/* Confirm BDT */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Confirm BDT Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">৳</span>
              <input
                type="number"
                value={confirmBDT}
                onChange={(e) => setConfirmBDT(e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                min="1"
              />
            </div>
          </div>

          <button
            onClick={() => onConfirm(confirmBkash, Number(confirmBDT))}
            disabled={processing || !confirmBkash.trim() || !confirmBDT}
            className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {processing ? "Processing…" : "Mark as Paid"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function CreditManagementPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const userEmail =
    session?.user?.email ||
    (typeof window !== "undefined" ? localStorage.getItem("userEmail") : null);
  const { user: viewer, loading: userLoading } =
    useCachedUserProfile<Record<string, any>>(userEmail);

  // Manual adjustment state
  const [reason, setReason] = useState("");
  const [credits, setCredits] = useState<number | "">(0);
  const [volunteerIds, setVolunteerIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [updateResults, setUpdateResults] = useState<UpdateResult[] | null>(null);

  // Payout state
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<"manual" | "payouts" | "history">("manual");

  // Pay modal
  const [payModal, setPayModal] = useState<Payout | null>(null);
  const [processingPayId, setProcessingPayId] = useState<string | null>(null);

  const { confirm, toast, prompt } = useModal();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") router.push("/auth");
  }, [status, router]);

  useEffect(() => {
    if (viewer) fetchPayouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer]);

  const fetchPayouts = async () => {
    try {
      setLoadingPayouts(true);
      const res = await fetch("/api/admin/credits/payouts");
      const data = await res.json();
      if (res.ok) {
        setPayouts(data.payouts || []);
        setSummary(data.summary || {});
      }
    } catch (e) {
      console.error("Failed to fetch payouts", e);
    } finally {
      setLoadingPayouts(false);
    }
  };

  if (status === "unauthenticated" || !viewer) return null;

  const displayName = viewer.fullName || viewer.username || session?.user?.name || "Admin";
  const displayEmail = viewer.email || session?.user?.email || "";
  const displayRole = (viewer.role as string) || "ADMIN";

  // ── Manual credit update ──
  const submitCredits = async () => {
    if (volunteerIds.length === 0) {
      toast("No volunteer IDs provided", { type: "error" });
      return;
    }
    if (credits === "" || Number.isNaN(Number(credits))) {
      toast("Please provide a valid credit amount", { type: "error" });
      return;
    }
    const sample = volunteerIds.slice(0, 6).join(", ");
    const ok = await confirm(
      `Apply ${Number(credits) > 0 ? "+" : ""}${credits} credits to ${volunteerIds.length} volunteer${volunteerIds.length > 1 ? "s" : ""}?\n\nSample IDs: ${sample}${volunteerIds.length > 6 ? ", …" : ""}`,
      "Confirm Credit Adjustment",
      Number(credits) < 0 ? "warning" : "info"
    );
    if (!ok) return;

    setSubmitting(true);
    setUpdateResults(null);
    try {
      const res = await fetch("/api/admin/credits/manual-update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reason: reason || "Manual credit adjustment",
          credits: Number(credits ?? 0),
          idsCsv: volunteerIds.join(","),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      if (Array.isArray(data.results)) setUpdateResults(data.results);
      else toast("Credits updated successfully", { type: "success" });
    } catch (e: any) {
      toast(e?.message || "Operation failed", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Process payout (complete or reject) ──
  const processPayout = async (
    payoutId: string,
    newStatus: "COMPLETED" | "REJECTED",
    confirmedBkash?: string,
    confirmedBDT?: number
  ) => {
    const payout = payouts.find((p) => p.id === payoutId);
    if (!payout) return;

    if (newStatus === "REJECTED") {
      const ok = await confirm(
        `Reject payout request from ${payout.user.fullName || payout.user.username}?\n\nAmount: ৳${payout.bdtAmount?.toFixed(2)} (${payout.credits?.toLocaleString()} credits)`,
        "Reject Payout",
        "warning"
      );
      if (!ok) return;
      const notes = await prompt("Rejection reason (optional):", "Reason", "Enter reason", "").catch(() => "");

      setProcessingPayId(payoutId);
      try {
        const res = await fetch("/api/admin/credits/payouts", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ payoutId, status: "REJECTED", notes }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed");
        toast("Payout rejected", { type: "success" });
        fetchPayouts();
      } catch (e: any) {
        toast(e?.message || "Failed", { type: "error" });
      } finally {
        setProcessingPayId(null);
      }
      return;
    }

    // COMPLETED — open pay modal first
    setPayModal(payout);
  };

  const handlePayConfirm = async (confirmedBkash: string, confirmedBDT: number) => {
    if (!payModal) return;
    setProcessingPayId(payModal.id);
    try {
      const res = await fetch("/api/admin/credits/payouts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          payoutId: payModal.id,
          status: "COMPLETED",
          confirmedBkash,
          confirmedBDT,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      toast("Payout marked as paid successfully", { type: "success" });
      setPayModal(null);
      fetchPayouts();
    } catch (e: any) {
      toast(e?.message || "Failed", { type: "error" });
    } finally {
      setProcessingPayId(null);
    }
  };

  const pendingPayouts = payouts.filter((p) => p.status === "PENDING");
  const historyPayouts = payouts.filter((p) => p.status !== "PENDING");

  return (
    <DashboardLayout
      userRole={displayRole as "VOLUNTEER" | "HR" | "MASTER" | "ADMIN" | "DIRECTOR" | "DATABASE_DEPT" | "SECRETARIES"}
      userName={displayName}
      userEmail={displayEmail}
      userId={viewer?.id || ""}
    >
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-6 flex items-center gap-3">
          {/* APC coin — float animation, full colour */}
          <div className="flex-shrink-0" style={{ animation: 'apc-coin-float 3s ease-in-out infinite' }}>
            <Image src="/icons/creditlogo.svg" alt="APC" width={44} height={44} unoptimized className="drop-shadow-lg" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Credit Management</h1>
            <p className="text-sm text-slate-500">
              Manage APC (Asadian Performance Credit) assignments and payout requests
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
          {[
            { label: "Total Credits Issued", value: (summary.totalCreditsIssued ?? 0).toLocaleString(), color: "blue" },
            { label: "Total BDT Paid", value: `৳${(summary.totalBDTPaid ?? 0).toLocaleString()}`, color: "green" },
            { label: "Pending Payouts", value: String(summary.totalPending ?? 0), color: "amber" },
            { label: "This Month (BDT)", value: `৳${(summary.monthlyBDT ?? 0).toLocaleString()}`, color: "indigo" },
          ].map((card) => (
            <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-slate-500 mb-1">{card.label}</div>
              <div className={`text-xl font-bold text-${card.color}-600`}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
          {(
            [
              { key: "manual", label: "Manual Adjustment" },
              {
                key: "payouts",
                label: `Payout Requests${pendingPayouts.length > 0 ? ` (${pendingPayouts.length})` : ""}`,
              },
              { key: "history", label: "Send History" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Manual Adjustment ── */}
        {activeTab === "manual" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-600">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <h2 className="font-semibold text-slate-800">Manual Credit Adjustment</h2>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reason / Task Title</label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="e.g. Event participation, Bonus credits"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Credits to Add / Deduct
                  <span className="ml-2 text-xs font-normal text-slate-500">(negative = deduction)</span>
                </label>
                <input
                  type="number"
                  value={credits as any}
                  onChange={(e) => setCredits(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                  placeholder="e.g. 500 or -100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Volunteer IDs
                  <span className="ml-2 text-xs font-normal text-slate-500">(numeric IDs only)</span>
                </label>
                <VolunteerIDChipInput volunteerIds={volunteerIds} onChange={setVolunteerIds} />
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                <button
                  onClick={submitCredits}
                  disabled={submitting || volunteerIds.length === 0}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-[#0b2545] text-white font-medium rounded-lg hover:bg-[#0d2d5a] disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing…
                    </span>
                  ) : (
                    `Apply to ${volunteerIds.length} Volunteer${volunteerIds.length !== 1 ? "s" : ""}`
                  )}
                </button>
                <button
                  onClick={() => { setReason(""); setCredits(0); setVolunteerIds([]); setUpdateResults(null); }}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Payout Requests ── */}
        {activeTab === "payouts" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-amber-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-600">
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                </svg>
                <h2 className="font-semibold text-slate-800">Payout Requests</h2>
              </div>
              <button onClick={fetchPayouts} className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                Refresh
              </button>
            </div>

            <div className="p-6">
              {loadingPayouts ? (
                <div className="text-center py-10 text-slate-500 text-sm">Loading…</div>
              ) : pendingPayouts.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl text-slate-500 text-sm">
                  No pending payout requests
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                        <th className="pb-3 pr-4 font-semibold">Volunteer</th>
                        <th className="pb-3 pr-4 font-semibold">Available Credits</th>
                        <th className="pb-3 pr-4 font-semibold">To Deduct</th>
                        <th className="pb-3 pr-4 font-semibold">BDT Amount</th>
                        <th className="pb-3 pr-4 font-semibold">bKash Number</th>
                        <th className="pb-3 pr-4 font-semibold">Request Date</th>
                        <th className="pb-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingPayouts.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 pr-4">
                            <div className="font-semibold text-slate-900">
                              {p.user.fullName || p.user.username}
                            </div>
                            {p.user.volunteerId && (
                              <div className="text-xs font-mono text-slate-500">ID: {p.user.volunteerId}</div>
                            )}
                            <div className="text-xs text-slate-500">{p.user.email}</div>
                          </td>
                          <td className="py-3 pr-4 font-semibold text-slate-800">
                            {(p.user.credits ?? 0).toLocaleString()}
                          </td>
                          <td className="py-3 pr-4 font-semibold text-amber-700">
                            {(p.credits ?? 0).toLocaleString()}
                          </td>
                          <td className="py-3 pr-4 font-bold text-green-700">৳{p.bdtAmount?.toFixed(2)}</td>
                          <td className="py-3 pr-4 font-mono text-slate-600">{p.bkashNumber || "—"}</td>
                          <td className="py-3 pr-4 text-slate-500 text-xs">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => processPayout(p.id, "COMPLETED")}
                                disabled={processingPayId === p.id}
                                className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-60 transition-colors"
                              >
                                Pay
                              </button>
                              <button
                                onClick={() => processPayout(p.id, "REJECTED")}
                                disabled={processingPayId === p.id}
                                className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-60 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Send History ── */}
        {activeTab === "history" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-green-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-600">
                  <path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <h2 className="font-semibold text-slate-800">Send History</h2>
              </div>
            </div>

            <div className="p-6">
              {historyPayouts.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl text-slate-500 text-sm">
                  No processed payouts yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                        <th className="pb-3 pr-4 font-semibold">Volunteer</th>
                        <th className="pb-3 pr-4 font-semibold">Credits Deducted</th>
                        <th className="pb-3 pr-4 font-semibold">BDT Amount</th>
                        <th className="pb-3 pr-4 font-semibold">bKash Number</th>
                        <th className="pb-3 pr-4 font-semibold">Paid By</th>
                        <th className="pb-3 pr-4 font-semibold">Date &amp; Time</th>
                        <th className="pb-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyPayouts.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 pr-4">
                            <div className="font-semibold text-slate-900">
                              {p.user.fullName || p.user.username}
                            </div>
                            {p.user.volunteerId && (
                              <div className="text-xs font-mono text-slate-500">ID: {p.user.volunteerId}</div>
                            )}
                          </td>
                          <td className="py-3 pr-4 font-semibold text-slate-700">
                            {p.status === "COMPLETED" ? (p.credits ?? 0).toLocaleString() : "—"}
                          </td>
                          <td className="py-3 pr-4 font-bold text-slate-700">৳{p.bdtAmount?.toFixed(2)}</td>
                          <td className="py-3 pr-4 font-mono text-slate-600">{p.bkashNumber || "—"}</td>
                          <td className="py-3 pr-4 text-slate-600">
                            {p.processedBy?.fullName || p.processedBy?.username || "—"}
                          </td>
                          <td className="py-3 pr-4 text-slate-500 text-xs">
                            {p.processedAt ? new Date(p.processedAt).toLocaleString() : "—"}
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                p.status === "COMPLETED"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {p.status}
                            </span>
                            {p.notes && (
                              <div className="text-xs text-slate-500 mt-1 italic">{p.notes}</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results modal */}
      {updateResults && (
        <ResultsModal results={updateResults} onClose={() => setUpdateResults(null)} />
      )}

      {/* Pay confirmation modal */}
      {payModal && (
        <PayModal
          payout={payModal}
          onClose={() => setPayModal(null)}
          onConfirm={handlePayConfirm}
          processing={processingPayId === payModal.id}
        />
      )}
    </DashboardLayout>
  );
}
