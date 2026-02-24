"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";
import { useModal } from "@/components/ui/ModalProvider";

type OrgRequest = {
  id: string;
  type: "SECTOR" | "CLUB";
  entityId: string;
  entityName: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  processedAt: string | null;
  user: {
    id: string;
    fullName: string | null;
    username: string | null;
    email: string | null;
    volunteerId: string | null;
  };
  processedBy: { fullName: string | null; username: string | null } | null;
};

type OrgEntity = {
  id: string;
  name: string;
  isOpen: boolean;
  type: "SECTOR" | "CLUB";
};

export default function OrgRequestsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const userEmail =
    session?.user?.email ||
    (typeof window !== "undefined" ? localStorage.getItem("userEmail") : null);
  const { user: viewer, loading: userLoading } =
    useCachedUserProfile<any>(userEmail);

  const [requests, setRequests] = useState<OrgRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "SECTOR" | "CLUB">("ALL");
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "ALL">(
    "PENDING"
  );

  const [orgs, setOrgs] = useState<OrgEntity[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [availTab, setAvailTab] = useState<"SECTOR" | "CLUB">("SECTOR");

  const { confirm, toast, prompt } = useModal();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") router.push("/auth");
  }, [status, router]);

  useEffect(() => {
    if (viewer) {
      fetchRequests();
      fetchOrgs();
    }
  }, [viewer]);

  const fetchOrgs = async () => {
    try {
      const res = await fetch("/api/orgs");
      const data = await res.json();
      const sectors = (data.sectors || []).map((s: any) => ({ ...s, type: "SECTOR" as const }));
      const clubs = (data.clubs || []).map((c: any) => ({ ...c, type: "CLUB" as const }));
      setOrgs([...sectors, ...clubs]);
    } catch (e) {
      // silently fail
    }
  };

  const toggleAvailability = async (org: OrgEntity) => {
    const nextOpen = !org.isOpen;
    const ok = await confirm(
      `${nextOpen ? 'Open' : 'Close'} "${org.name}" for new member applications?`,
      `Confirm Availability Change`,
      nextOpen ? 'info' : 'warning'
    );
    if (!ok) return;
    setTogglingId(org.id);
    try {
      const res = await fetch(`/api/admin/orgs/${org.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: org.type, isOpen: nextOpen }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, isOpen: nextOpen } : o));
      toast(`"${org.name}" is now ${nextOpen ? 'open' : 'closed'} for applications`, { type: 'success' });
    } catch (e: any) {
      toast(e?.message || 'Failed to update', { type: 'error' });
    } finally {
      setTogglingId(null);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/org-join-requests");
      const data = await res.json();
      if (res.ok) setRequests(data.requests || []);
      else toast(data.error || "Failed to load", { type: "error" });
    } catch (e) {
      toast("Network error", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const processRequest = async (
    requestId: string,
    status: "APPROVED" | "REJECTED"
  ) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;

    const ok = await confirm(
      `${status === "APPROVED" ? "Approve" : "Reject"} join request from ${req.user.fullName || req.user.username} for ${req.type === "SECTOR" ? "sector" : "club"} "${req.entityName}"?`,
      `Confirm ${status === "APPROVED" ? "Approval" : "Rejection"}`,
      status === "REJECTED" ? "warning" : "info"
    );
    if (!ok) return;

    let notes = "";
    if (status === "REJECTED") {
      try {
        const r = await prompt(
          "Rejection reason (optional):",
          "Reason",
          "Enter reason",
          ""
        );
        notes = r || "";
      } catch (e) {
        notes = "";
      }
    }

    setProcessingId(requestId);
    try {
      const res = await fetch(`/api/admin/org-join-requests/${requestId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      toast(
        `Request ${status === "APPROVED" ? "approved" : "rejected"} successfully`,
        { type: "success" }
      );
      fetchRequests();
    } catch (e: any) {
      toast(e?.message || "Operation failed", { type: "error" });
    } finally {
      setProcessingId(null);
    }
  };

  if (status === "unauthenticated" || !viewer) return null;

  const displayName =
    viewer?.fullName ||
    viewer?.username ||
    (session as any)?.user?.name ||
    "Admin";
  const displayEmail =
    viewer?.email || (session as any)?.user?.email || "";
  const displayRole = (viewer?.role as any) || "ADMIN";

  const filteredRequests = requests.filter((r) => {
    if (filter !== "ALL" && r.type !== filter) return false;
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <DashboardLayout
      userRole={displayRole}
      userName={displayName}
      userEmail={displayEmail}
      userId={viewer?.id || ""}
    >
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-[#0b2545]/10 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0b2545"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Sector/Club Management
              </h1>
              <p className="text-sm text-slate-600">
                Manage sector &amp; club membership requests
              </p>
            </div>
            {pendingCount > 0 && (
              <span className="ml-2 px-3 py-1 bg-amber-100 text-amber-800 text-sm font-semibold rounded-full">
                {pendingCount} pending
              </span>
            )}
          </div>
        </div>

        {/* Availability Management */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-900">Availability Management</div>
              <div className="text-xs text-slate-500 mt-0.5">Control which sectors &amp; clubs accept new member applications</div>
            </div>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {(["SECTOR", "CLUB"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setAvailTab(t)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    availTab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t === 'SECTOR' ? 'Sectors' : 'Clubs'}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {orgs.filter(o => o.type === availTab).length === 0 ? (
              <div className="text-center text-sm text-slate-400 py-8">No {availTab.toLowerCase()}s found.</div>
            ) : (
              orgs.filter(o => o.type === availTab).map(org => (
                <div key={org.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ org.isOpen ? 'bg-emerald-500' : 'bg-slate-300' }`} />
                    <div>
                      <div className="text-sm font-medium text-slate-900">{org.name}</div>
                      <div className={`text-xs ${ org.isOpen ? 'text-emerald-600' : 'text-slate-400' }`}>
                        {org.isOpen ? 'Accepting applications' : 'Closed for applications'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAvailability(org)}
                    disabled={togglingId === org.id}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-60 ${
                      org.isOpen ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                    role="switch"
                    aria-checked={org.isOpen}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        org.isOpen ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {(["PENDING", "ALL"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {s === "PENDING" ? "Pending" : "All"}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {(["ALL", "SECTOR", "CLUB"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {f === "ALL" ? "All Types" : f === "SECTOR" ? "Sectors" : "Clubs"}
              </button>
            ))}
          </div>
          <button
            onClick={fetchRequests}
            className="ml-auto px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Requests List */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No requests found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className={`p-4 hover:bg-slate-50 transition-colors ${
                    req.status === "PENDING" ? "bg-amber-50/30" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Type badge */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            req.type === "SECTOR"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {req.type === "SECTOR" ? "🎯 SECTOR" : "🏆 CLUB"}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {req.entityName || req.entityId}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            req.status === "PENDING"
                              ? "bg-amber-100 text-amber-700"
                              : req.status === "APPROVED"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>

                      {/* User info */}
                      <div className="text-sm text-slate-700">
                        {req.user.fullName || req.user.username}
                        {req.user.volunteerId && (
                          <span className="ml-2 text-xs font-mono text-slate-500">
                            ID: {req.user.volunteerId}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {req.user.email}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Requested:{" "}
                        {new Date(req.createdAt).toLocaleString("en-US", {
                          timeZone: "Asia/Dhaka",
                        })}
                        {req.processedAt &&
                          ` · Processed: ${new Date(req.processedAt).toLocaleString("en-US", { timeZone: "Asia/Dhaka" })}`}
                        {req.processedBy &&
                          ` by ${req.processedBy.fullName || req.processedBy.username}`}
                      </div>
                      {req.notes && (
                        <div className="text-xs text-red-600 mt-1 italic">
                          Note: {req.notes}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {req.status === "PENDING" && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => processRequest(req.id, "APPROVED")}
                          disabled={processingId === req.id}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors"
                        >
                          {processingId === req.id ? "..." : "Approve"}
                        </button>
                        <button
                          onClick={() => processRequest(req.id, "REJECTED")}
                          disabled={processingId === req.id}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
                        >
                          {processingId === req.id ? "..." : "Reject"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
