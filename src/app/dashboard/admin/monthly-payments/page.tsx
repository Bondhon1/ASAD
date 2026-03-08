"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";
import { useModal } from "@/components/ui/ModalProvider";
import { MONTH_NAMES, DONATION_MONTHS, getDhakaToday } from "@/lib/monthlyPayment";

const ADMIN_ROLES = ["MASTER", "ADMIN", "HR"];

type TabKey = "config" | "submissions" | "delay-requests";

interface MonthlyConfig {
  id: string;
  month: number;
  year: number;
  amount: number;
  fine: number;
  deadline: number;
  bkashNumber: string | null;
  nagadNumber: string | null;
  notes: string | null;
  createdBy: { fullName: string | null; volunteerId: string | null } | null;
  updatedAt: string;
}

interface Submission {
  id: string;
  month: number;
  year: number;
  baseAmount: number;
  fineAmount: number;
  totalAmount: number;
  isLate: boolean;
  isDelayApproved: boolean;
  senderNumber: string;
  paymentMethod: string;
  trxId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  submittedAt: string;
  user: { id: string; fullName: string | null; volunteerId: string | null; email: string | null; institute: { name: string } | null };
  approvedBy: { fullName: string | null; volunteerId: string | null } | null;
  approvedAt: string | null;
}

interface DelayRequest {
  id: string;
  month: number;
  year: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: { id: string; fullName: string | null; volunteerId: string | null; email: string | null; institute: { name: string } | null };
  reviewedBy: { fullName: string | null; volunteerId: string | null } | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
};

export default function AdminMonthlyPaymentsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email || (typeof window !== "undefined" ? localStorage.getItem("userEmail") : null);
  const { user: viewer, loading: userLoading } = useCachedUserProfile<any>(userEmail);
  const { toast, confirm, prompt } = useModal();

  const [activeTab, setActiveTab] = useState<TabKey>("config");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Config tab state ──────────────────────────────────────────────────────
  const today = typeof window !== "undefined" ? getDhakaToday() : { month: new Date().getMonth() + 1, year: new Date().getFullYear(), day: new Date().getDate() };
  const [configMonth, setConfigMonth] = useState(today.month);
  const [configYear, setConfigYear] = useState(today.year);
  const [configData, setConfigData] = useState<MonthlyConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configForm, setConfigForm] = useState({ amount: "35", fine: "5", deadline: "15", bkashNumber: "", nagadNumber: "", notes: "" });
  const [configSaving, setConfigSaving] = useState(false);

  // ── Submissions tab state ─────────────────────────────────────────────────
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsFilter, setSubsFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "all">("PENDING");
  const [subsMonthFilter, setSubsMonthFilter] = useState<string>(`${today.month}-${today.year}`);

  // ── Delay requests tab state ──────────────────────────────────────────────
  const [delayRequests, setDelayRequests] = useState<DelayRequest[]>([]);
  const [delayLoading, setDelayLoading] = useState(false);
  const [delayFilter, setDelayFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "all">("PENDING");

  // Access control
  useEffect(() => {
    if (userLoading) return;
    if (!viewer) return;
    if (!ADMIN_ROLES.includes(viewer.role)) {
      router.replace("/dashboard");
    }
  }, [viewer, userLoading, router]);

  // ── Fetch config ──────────────────────────────────────────────────────────
  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await fetch(`/api/admin/monthly-payments/config?month=${configMonth}&year=${configYear}`);
      if (!res.ok) return;
      const data = await res.json();
      setConfigData(data.config ?? null);
      if (data.config) {
        setConfigForm({
          amount: String(data.config.amount),
          fine: String(data.config.fine),
          deadline: String(data.config.deadline),
          bkashNumber: data.config.bkashNumber ?? "",
          nagadNumber: data.config.nagadNumber ?? "",
          notes: data.config.notes ?? "",
        });
      } else {
        setConfigForm({ amount: "35", fine: "5", deadline: "15", bkashNumber: "", nagadNumber: "", notes: "" });
      }
    } catch {
      toast("Failed to load config", { type: "error" });
    } finally {
      setConfigLoading(false);
    }
  }, [configMonth, configYear, toast]);

  useEffect(() => {
    if (activeTab === "config") fetchConfig();
  }, [activeTab, fetchConfig]);

  const saveConfig = async () => {
    setConfigSaving(true);
    try {
      const res = await fetch("/api/admin/monthly-payments/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          month: configMonth,
          year: configYear,
          amount: parseFloat(configForm.amount) || 35,
          fine: parseFloat(configForm.fine) || 0,
          deadline: parseInt(configForm.deadline) || 15,
          bkashNumber: configForm.bkashNumber,
          nagadNumber: configForm.nagadNumber,
          notes: configForm.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Failed to save", { type: "error" }); return; }
      toast(`Configuration saved for ${MONTH_NAMES[configMonth]} ${configYear}`, { type: "success" });
      fetchConfig();
    } catch {
      toast("Network error", { type: "error" });
    } finally {
      setConfigSaving(false);
    }
  };

  // ── Fetch submissions ─────────────────────────────────────────────────────
  const fetchSubmissions = useCallback(async () => {
    setSubsLoading(true);
    try {
      const [monthPart, yearPart] = subsMonthFilter === "all" ? [null, null] : subsMonthFilter.split("-");
      const params = new URLSearchParams();
      if (subsFilter !== "all") params.set("status", subsFilter);
      if (monthPart) params.set("month", monthPart);
      if (yearPart) params.set("year", yearPart);
      const res = await fetch(`/api/admin/monthly-payments/submissions?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch {
      toast("Failed to load submissions", { type: "error" });
    } finally {
      setSubsLoading(false);
    }
  }, [subsFilter, subsMonthFilter, toast]);

  useEffect(() => {
    if (activeTab === "submissions") fetchSubmissions();
  }, [activeTab, fetchSubmissions]);

  const handleSubmissionAction = async (id: string, action: "approve" | "reject") => {
    let rejectionReason: string | null = null;
    if (action === "reject") {
      rejectionReason = await prompt("Enter rejection reason:", "Reject payment", "Reason for rejection");
      if (!rejectionReason?.trim()) return;
    } else {
      const ok = await confirm("Approve this monthly payment?", "Confirm Approval");
      if (!ok) return;
    }
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/monthly-payments/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, rejectionReason }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Action failed", { type: "error" }); return; }
      toast(`Payment ${action === "approve" ? "approved" : "rejected"} successfully`, { type: "success" });
      fetchSubmissions();
    } catch {
      toast("Network error", { type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  // ── Fetch delay requests ──────────────────────────────────────────────────
  const fetchDelayRequests = useCallback(async () => {
    setDelayLoading(true);
    try {
      const params = new URLSearchParams();
      if (delayFilter !== "all") params.set("status", delayFilter);
      const res = await fetch(`/api/admin/monthly-payments/delay-requests?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setDelayRequests(data.requests || []);
    } catch {
      toast("Failed to load delay requests", { type: "error" });
    } finally {
      setDelayLoading(false);
    }
  }, [delayFilter, toast]);

  useEffect(() => {
    if (activeTab === "delay-requests") fetchDelayRequests();
  }, [activeTab, fetchDelayRequests]);

  const handleDelayAction = async (id: string, action: "approve" | "reject") => {
    let adminNote: string | null = null;
    if (action === "reject") {
      adminNote = await prompt("Add a note for the user (optional):", "Reject delay request", "Note (optional)");
      if (adminNote === null) return; // user cancelled
    } else {
      const ok = await confirm("Approve this delay request? The user will be able to pay without a fine.", "Confirm Approval");
      if (!ok) return;
    }
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/monthly-payments/delay-requests/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, adminNote: adminNote || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Action failed", { type: "error" }); return; }
      toast(`Delay request ${action === "approve" ? "approved" : "rejected"}`, { type: "success" });
      fetchDelayRequests();
    } catch {
      toast("Network error", { type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  // ── Auth guard ─────────────────────────────────────────────────────────────
  if (status === "loading" || userLoading) {
    return (
      <DashboardLayout userRole="ADMIN" userName="" userEmail="" userId="">
        <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
        </div>
      </DashboardLayout>
    );
  }

  if (!viewer || !ADMIN_ROLES.includes(viewer.role)) return null;

  const displayRole = viewer.role as "MASTER" | "ADMIN" | "HR";
  const displayName = viewer.fullName || viewer.username || "Admin";
  const displayEmail = viewer.email || "";

  // Generate month options (current + next + previous)
  const monthOptions: { value: string; label: string }[] = [];
  for (let i = -6; i <= 3; i++) {
    let m = today.month + i;
    let y = today.year;
    while (m <= 0) { m += 12; y--; }
    while (m > 12) { m -= 12; y++; }
    if (DONATION_MONTHS.includes(m)) {
      monthOptions.push({ value: `${m}-${y}`, label: `${MONTH_NAMES[m]} ${y}` });
    }
  }

  const tabs: { key: TabKey; label: string; badge?: number }[] = [
    { key: "config", label: "Configuration" },
    { key: "submissions", label: "Submissions", badge: submissions.filter(s => s.status === "PENDING").length || undefined },
    { key: "delay-requests", label: "Delay Requests", badge: delayRequests.filter(d => d.status === "PENDING").length || undefined },
  ];

  return (
    <DashboardLayout userRole={displayRole} userName={displayName} userEmail={displayEmail} userId={viewer.id || ""}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0b2545]">Monthly Payments</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage monthly donation configuration and review submissions.
            Donation months: Jan, Mar, May, Jul, Sep, Nov.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.key
                  ? "bg-white text-[#0b2545] shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Config Tab ────────────────────────────────────────────────────── */}
        {activeTab === "config" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Set Configuration</h2>

              {/* Month + Year selector */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
                  <select
                    value={configMonth}
                    onChange={e => setConfigMonth(parseInt(e.target.value))}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0b2545]"
                  >
                    {DONATION_MONTHS.map(m => (
                      <option key={m} value={m}>{MONTH_NAMES[m]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                  <select
                    value={configYear}
                    onChange={e => setConfigYear(parseInt(e.target.value))}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0b2545]"
                  >
                    {[today.year - 1, today.year, today.year + 1].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {configLoading ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg" />)}
                </div>
              ) : (
                <>
                  {configData && (
                    <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-700">
                      Configuration exists for {MONTH_NAMES[configData.month]} {configData.year}
                      {configData.createdBy && ` · Set by ${configData.createdBy.fullName ?? "Admin"}`}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Amount (৳) <span className="text-gray-400">default: 35</span></label>
                      <input
                        type="number"
                        min={1}
                        value={configForm.amount}
                        onChange={e => setConfigForm(f => ({ ...f, amount: e.target.value }))}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0b2545]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Fine (৳) <span className="text-gray-400">default: 5</span></label>
                      <input
                        type="number"
                        min={0}
                        value={configForm.fine}
                        onChange={e => setConfigForm(f => ({ ...f, fine: e.target.value }))}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0b2545]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Deadline (day) <span className="text-gray-400">default: 15</span></label>
                      <input
                        type="number"
                        min={1}
                        max={28}
                        value={configForm.deadline}
                        onChange={e => setConfigForm(f => ({ ...f, deadline: e.target.value }))}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0b2545]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">bKash Number</label>
                      <input
                        type="tel"
                        value={configForm.bkashNumber}
                        onChange={e => setConfigForm(f => ({ ...f, bkashNumber: e.target.value }))}
                        placeholder="01XXXXXXXXX"
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0b2545]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nagad Number</label>
                      <input
                        type="tel"
                        value={configForm.nagadNumber}
                        onChange={e => setConfigForm(f => ({ ...f, nagadNumber: e.target.value }))}
                        placeholder="01XXXXXXXXX"
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0b2545]"
                      />
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                    <input
                      type="text"
                      value={configForm.notes}
                      onChange={e => setConfigForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Any notes for this month..."
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0b2545]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Total due (with fine): <strong className="text-gray-800">৳{(parseFloat(configForm.amount) || 0) + (parseFloat(configForm.fine) || 0)}</strong>
                    </div>
                    <button
                      onClick={saveConfig}
                      disabled={configSaving}
                      className="bg-[#0b2545] text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d2d54] disabled:opacity-60 transition-colors"
                    >
                      {configSaving ? "Saving..." : configData ? "Update Config" : "Save Config"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Submissions Tab ───────────────────────────────────────────────── */}
        {activeTab === "submissions" && (
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {(["PENDING", "APPROVED", "REJECTED", "all"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setSubsFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${subsFilter === f ? "bg-white shadow-sm text-[#0b2545] font-semibold" : "text-gray-500 hover:text-gray-800"}`}
                  >
                    {f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <select
                value={subsMonthFilter}
                onChange={e => setSubsMonthFilter(e.target.value)}
                className="border-2 border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#0b2545]"
              >
                <option value="all">All months</option>
                {monthOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button onClick={fetchSubmissions} className="ml-auto text-xs text-[#0b2545] hover:underline font-medium">↻ Refresh</button>
            </div>

            {subsLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
              </div>
            ) : submissions.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
                No submissions found.
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map(sub => (
                  <div key={sub.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm">
                            {sub.user.fullName ?? "Unknown"}
                          </span>
                          {sub.user.volunteerId && (
                            <span className="text-xs text-gray-500 font-mono">#{sub.user.volunteerId}</span>
                          )}
                          <span className={`text-xs border rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[sub.status]}`}>
                            {sub.status}
                          </span>
                          {sub.isLate && (
                            <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5 font-medium">
                              Late
                            </span>
                          )}
                          {sub.isDelayApproved && (
                            <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5 font-medium">
                              Delay approved
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {sub.user.institute?.name ?? "—"} · {sub.user.email}
                        </div>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-gray-600">
                          <div><span className="text-gray-400">Month:</span> <strong>{MONTH_NAMES[sub.month]} {sub.year}</strong></div>
                          <div><span className="text-gray-400">Amount:</span> <strong className="text-green-700">৳{sub.totalAmount}</strong>{sub.fineAmount > 0 && <span className="text-red-500 ml-1">(+৳{sub.fineAmount} fine)</span>}</div>
                          <div><span className="text-gray-400">Method:</span> <strong className="capitalize">{sub.paymentMethod}</strong></div>
                          <div><span className="text-gray-400">TrxID:</span> <span className="font-mono">{sub.trxId}</span></div>
                          <div><span className="text-gray-400">From:</span> <span className="font-mono">{sub.senderNumber}</span></div>
                          <div><span className="text-gray-400">Submitted:</span> {new Date(sub.submittedAt).toLocaleString("en-US", { timeZone: "Asia/Dhaka", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                          {sub.approvedBy && (
                            <div className="col-span-2"><span className="text-gray-400">Reviewed by:</span> {sub.approvedBy.fullName ?? "Admin"}</div>
                          )}
                        </div>
                        {sub.rejectionReason && (
                          <div className="mt-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                            Rejection: {sub.rejectionReason}
                          </div>
                        )}
                      </div>

                      {sub.status === "PENDING" && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleSubmissionAction(sub.id, "approve")}
                            disabled={actionLoading === sub.id}
                            className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-semibold disabled:opacity-60 transition-colors"
                          >
                            {actionLoading === sub.id ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleSubmissionAction(sub.id, "reject")}
                            disabled={actionLoading === sub.id}
                            className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-semibold disabled:opacity-60 transition-colors"
                          >
                            {actionLoading === sub.id ? "..." : "Reject"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Delay Requests Tab ───────────────────────────────────────────── */}
        {activeTab === "delay-requests" && (
          <div className="space-y-4">
            <div className="flex gap-3 items-center">
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {(["PENDING", "APPROVED", "REJECTED", "all"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setDelayFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${delayFilter === f ? "bg-white shadow-sm text-[#0b2545] font-semibold" : "text-gray-500 hover:text-gray-800"}`}
                  >
                    {f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <button onClick={fetchDelayRequests} className="ml-auto text-xs text-[#0b2545] hover:underline font-medium">↻ Refresh</button>
            </div>

            {delayLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
              </div>
            ) : delayRequests.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
                No delay requests found.
              </div>
            ) : (
              <div className="space-y-3">
                {delayRequests.map(req => (
                  <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm">{req.user.fullName ?? "Unknown"}</span>
                          {req.user.volunteerId && (
                            <span className="text-xs text-gray-500 font-mono">#{req.user.volunteerId}</span>
                          )}
                          <span className={`text-xs border rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[req.status]}`}>
                            {req.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {req.user.institute?.name ?? "—"} · {req.user.email}
                        </div>
                        <div className="mt-2 text-xs text-gray-600">
                          <strong>Month:</strong> {MONTH_NAMES[req.month]} {req.year} ·{" "}
                          <strong>Requested:</strong> {new Date(req.createdAt).toLocaleString("en-US", { timeZone: "Asia/Dhaka", month: "short", day: "numeric" })}
                        </div>
                        <div className="mt-2 bg-gray-50 rounded-lg p-2 text-xs text-gray-700">
                          <strong>Reason:</strong> {req.reason}
                        </div>
                        {req.adminNote && (
                          <div className="mt-1 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
                            Admin note: {req.adminNote}
                          </div>
                        )}
                        {req.reviewedBy && (
                          <div className="mt-1 text-xs text-gray-500">
                            Reviewed by {req.reviewedBy.fullName ?? "Admin"}
                          </div>
                        )}
                      </div>

                      {req.status === "PENDING" && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleDelayAction(req.id, "approve")}
                            disabled={actionLoading === req.id}
                            className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-semibold disabled:opacity-60 transition-colors"
                          >
                            {actionLoading === req.id ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleDelayAction(req.id, "reject")}
                            disabled={actionLoading === req.id}
                            className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-semibold disabled:opacity-60 transition-colors"
                          >
                            {actionLoading === req.id ? "..." : "Reject"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
