"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";
import { useModal } from "@/components/ui/ModalProvider";

interface LeaveUser {
  id: string;
  fullName: string | null;
  volunteerId: string | null;
  email: string;
  profilePicUrl?: string | null;
}

interface Leave {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "DECLINED";
  feedback: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: LeaveUser;
  reviewedBy: { fullName: string | null; volunteerId: string | null } | null;
}

const HR_ROLES = ["HR", "MASTER", "ADMIN", "DIRECTOR"];

export default function HRLeavePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email || "";
  const { user: cachedUser, loading: userLoading } = useCachedUserProfile<any>(userEmail);
  const { toast } = useModal();

  const [viewer, setViewer] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "DECLINED">("ALL");
  const [sortBy, setSortBy] = useState<"createdAt" | "startDate" | "volunteerId">("createdAt");

  // Modal state for reviewing a leave
  const [selected, setSelected] = useState<Leave | null>(null);
  const [feedback, setFeedback] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [processing, setProcessing] = useState(false);

  // Auth
  useEffect(() => {
    if (status === "loading" || userLoading) return;
    if (status === "unauthenticated") { router.push("/auth/login"); return; }

    if (cachedUser) {
      setViewer(cachedUser);
      if (!HR_ROLES.includes(cachedUser.role)) {
        router.push("/dashboard");
        return;
      }
      setAuthChecked(true);
    } else if (session?.user?.email) {
      fetch(`/api/user/profile?email=${encodeURIComponent(session.user.email)}`)
        .then(r => r.json())
        .then(d => {
          if (d.user) {
            setViewer(d.user);
            if (!HR_ROLES.includes(d.user.role)) {
              router.push("/dashboard");
              return;
            }
            setAuthChecked(true);
          }
        });
    }
  }, [status, session, cachedUser, userLoading, router]);

  // Fetch leaves
  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      params.set("sortBy", sortBy);
      const res = await fetch(`/api/hr/leave?${params.toString()}`);
      const data = await res.json();
      setLeaves(data.leaves || []);
    } catch (e) {
      console.error("Failed to fetch leaves", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authChecked) fetchLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, statusFilter, sortBy]);

  const openReview = (leave: Leave) => {
    setSelected(leave);
    setFeedback(leave.feedback || "");
    setEditStartDate(leave.startDate.slice(0, 10));
    setEditEndDate(leave.endDate.slice(0, 10));
  };

  const handleAction = async (action: "APPROVE" | "DECLINE" | "EDIT") => {
    if (!selected) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/hr/leave/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          feedback: feedback.trim() || undefined,
          startDate: editStartDate,
          endDate: editEndDate,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(
          action === "APPROVE" ? "Leave approved" : action === "DECLINE" ? "Leave declined" : "Leave updated",
          { type: "success" }
        );
        setLeaves(prev => prev.map(l => (l.id === selected.id ? data.leave : l)));
        setSelected(null);
      } else {
        toast(data.error || "Failed to process leave", { type: "error" });
      }
    } catch (e) {
      toast("Network error", { type: "error" });
    } finally {
      setProcessing(false);
    }
  };

  const statusBadge = (status: string) => {
    if (status === "APPROVED")
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">✓ Approved</span>;
    if (status === "DECLINED")
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">✗ Declined</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">⏳ Pending</span>;
  };

  if (!authChecked) {
    return (
      <DashboardLayout userRole="HR" userName="" userEmail="" userId="">
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading...</div>
      </DashboardLayout>
    );
  }

  const pendingCount = leaves.filter(l => l.status === "PENDING").length;

  return (
    <DashboardLayout
      userRole={viewer?.role || "HR"}
      userName={viewer?.fullName || viewer?.username || "HR"}
      userEmail={viewer?.email || ""}
      userId={viewer?.id || ""}
    >
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#07223f]">Leave Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Review and manage volunteer leave requests
              {pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  {pendingCount} pending
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg p-1">
            {(["ALL", "PENDING", "APPROVED", "DECLINED"] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-[#07223f] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-xs text-gray-500">Sort by:</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white"
            >
              <option value="createdAt">Date Submitted</option>
              <option value="startDate">Leave Start Date</option>
              <option value="volunteerId">Volunteer ID</option>
            </select>
          </div>
        </div>

        {/* Leave List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 bg-gray-200 rounded" />
                    <div className="h-3 w-64 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : leaves.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-lg py-16 text-center">
            <div className="text-4xl mb-3">📋</div>
            <div className="text-sm font-medium text-gray-700">No leave requests</div>
            <div className="text-xs text-gray-400 mt-1">
              {statusFilter !== "ALL" ? `No ${statusFilter.toLowerCase()} leave requests found.` : "There are no leave requests yet."}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {leaves.map(leave => (
              <div
                key={leave.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-[#07223f]/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-[#07223f]/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-[#07223f]">
                      {leave.user.fullName?.[0]?.toUpperCase() || "?"}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900">
                          {leave.user.fullName || leave.user.email}
                        </span>
                        {leave.user.volunteerId && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                            {leave.user.volunteerId}
                          </span>
                        )}
                        {statusBadge(leave.status)}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        <span className="font-medium text-gray-700">
                          {new Date(leave.startDate).toLocaleDateString()} – {new Date(leave.endDate).toLocaleDateString()}
                        </span>
                        <span className="mx-1.5 text-gray-300">·</span>
                        Submitted {new Date(leave.createdAt).toLocaleDateString()}
                      </div>
                      <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">{leave.reason}</p>
                      {leave.feedback && (
                        <div className="mt-1.5 p-2 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800">
                          <span className="font-semibold">Feedback:</span> {leave.feedback}
                        </div>
                      )}
                      {leave.reviewedBy && (
                        <div className="text-xs text-gray-400 mt-1">
                          Reviewed by {leave.reviewedBy.fullName || "HR"} on{" "}
                          {leave.reviewedAt ? new Date(leave.reviewedAt).toLocaleDateString() : "—"}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => openReview(leave)}
                    className="flex-shrink-0 px-3 py-1.5 bg-[#07223f] hover:bg-[#0d2d5a] text-white text-xs font-medium rounded-md transition-colors"
                  >
                    {leave.status === "PENDING" ? "Review" : "Edit"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-[#07223f]">Review Leave Request</h2>
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Volunteer info */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-900">
                    {selected.user.fullName || selected.user.email}
                  </span>
                  {selected.user.volunteerId && (
                    <span className="text-xs text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono">
                      {selected.user.volunteerId}
                    </span>
                  )}
                  {statusBadge(selected.status)}
                </div>
                <div className="text-sm text-gray-700 mt-1">
                  <span className="font-medium">Reason:</span> {selected.reason}
                </div>
              </div>

              {/* Date range editor */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date Range</label>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <div>
                    <label className="text-xs text-gray-500">From Date</label>
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={e => setEditStartDate(e.target.value)}
                      className="w-full mt-1 p-2 border border-gray-200 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">To Date</label>
                    <input
                      type="date"
                      value={editEndDate}
                      onChange={e => setEditEndDate(e.target.value)}
                      className="w-full mt-1 p-2 border border-gray-200 rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Feedback */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Feedback / Comment <span className="text-gray-400 font-normal normal-case">(optional, visible to volunteer)</span>
                </label>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  rows={3}
                  placeholder="Write feedback or reason for your decision..."
                  className="w-full mt-1.5 p-2 border border-gray-200 rounded-md text-sm resize-none focus:outline-none focus:border-[#0b2545]/40"
                />
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  onClick={() => handleAction("APPROVE")}
                  disabled={processing || selected.status === "APPROVED"}
                  className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  {processing ? "Processing..." : "✓ Approve"}
                </button>
                <button
                  onClick={() => handleAction("DECLINE")}
                  disabled={processing || selected.status === "DECLINED"}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  {processing ? "Processing..." : "✗ Decline"}
                </button>
                <button
                  onClick={() => handleAction("EDIT")}
                  disabled={processing}
                  className="flex-1 py-2.5 rounded-xl bg-[#07223f] hover:bg-[#0d2d5a] text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  {processing ? "Processing..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
