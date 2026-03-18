"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";
import React from "react";

type ManualAdjustment = {
  id: string;
  actorUserId: string;
  actorName: string | null;
  actorEmail: string | null;
  actorVolunteerId: string | null;
  actorRole: string | null;
  createdAt: string;
  reason: string;
  credits: number;
  affectedUsers: number;
  successCount: number;
  failCount: number;
  totalCreditsAdded: number;
  rawMeta: any;
};

export default function CreditManualHistoryPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { user: viewer, loading: viewerLoading } = useCachedUserProfile<any>();

  const [adjustments, setAdjustments] = useState<ManualAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const displayName = viewer?.fullName || session?.user?.name || "User";
  const displayEmail = session?.user?.email || "";
  const displayRole = viewer?.role || "VOLUNTEER";

  // Access control
  useEffect(() => {
    if (sessionStatus === "unauthenticated") router.push("/");
    if (!viewerLoading && viewer && viewer.role !== "MASTER") {
      router.push("/dashboard");
    }
  }, [sessionStatus, viewerLoading, viewer, router]);

  // Fetch adjustments
  useEffect(() => {
    const fetchAdjustments = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/credits/manual-history");
        if (!res.ok) throw new Error("Failed to fetch adjustments");
        const data = await res.json();
        setAdjustments(data.adjustments || []);
      } catch (err) {
        console.error("Failed to fetch manual adjustments:", err);
      } finally {
        setLoading(false);
      }
    };

    if (viewer?.role === "MASTER") {
      fetchAdjustments();
    }
  }, [viewer]);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Filter adjustments
  const filteredAdjustments = adjustments.filter((adj) => {
    const term = searchTerm.toLowerCase();
    return (
      adj.reason.toLowerCase().includes(term) ||
      adj.actorName?.toLowerCase().includes(term) ||
      adj.actorEmail?.toLowerCase().includes(term) ||
      adj.actorVolunteerId?.toLowerCase().includes(term)
    );
  });

  if (sessionStatus === "loading" || viewerLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <DashboardLayout
      userRole={displayRole as "VOLUNTEER" | "HR" | "MASTER" | "ADMIN" | "DIRECTOR" | "DATABASE_DEPT" | "SECRETARIES"}
      userName={displayName}
      userEmail={displayEmail}
      userId={viewer?.id || ""}
    >
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.push("/dashboard/admin/credit-management")}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Manual Credit Adjustment History</h1>
              <p className="text-sm text-slate-500">View all manual credit adjustments made by admins</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by reason, admin name, email, or volunteer ID..."
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading adjustments...</div>
          ) : filteredAdjustments.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {searchTerm ? "No matching adjustments found" : "No manual adjustments recorded yet"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date/Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Admin</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Reason</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Credits/User</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Affected</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Added</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredAdjustments.map((adj) => (
                    <React.Fragment key={adj.id}>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {new Date(adj.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-slate-900">{adj.actorName || 'Unknown'}</div>
                          <div className="text-xs text-slate-500">{adj.actorEmail}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          <div className="max-w-xs truncate">{adj.reason}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className={`font-mono font-semibold ${adj.credits > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {adj.credits > 0 ? '+' : ''}{adj.credits.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="text-slate-900 font-medium">{adj.successCount} success</div>
                          {adj.failCount > 0 && (
                            <div className="text-xs text-red-600">{adj.failCount} failed</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className="font-mono font-bold text-blue-600">
                            {adj.totalCreditsAdded > 0 ? '+' : ''}{adj.totalCreditsAdded.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleRow(adj.id)}
                            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className={`transition-transform ${expandedRows.has(adj.id) ? 'rotate-180' : ''}`}
                            >
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                      {expandedRows.has(adj.id) && adj.rawMeta?.results && (
                        <tr>
                          <td colSpan={7} className="px-4 py-4 bg-slate-50">
                            <div className="text-xs font-semibold text-slate-600 mb-2 uppercase">Affected Users:</div>
                            <div className="space-y-1 max-h-60 overflow-y-auto">
                              {adj.rawMeta.results.map((result: any, idx: number) => (
                                <div
                                  key={idx}
                                  className={`p-2 rounded text-xs flex items-center justify-between ${
                                    result.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                                  }`}
                                >
                                  <div>
                                    <span className="font-mono font-semibold">{result.ident}</span>
                                    {result.ok && result.newCredits !== undefined && (
                                      <span className="ml-2 text-slate-600">
                                        → {result.newCredits.toLocaleString()} credits
                                      </span>
                                    )}
                                    {!result.ok && result.error && (
                                      <span className="ml-2 text-red-700">Error: {result.error}</span>
                                    )}
                                  </div>
                                  <span className={`font-semibold ${result.ok ? 'text-green-600' : 'text-red-600'}`}>
                                    {result.ok ? '✓' : '✗'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        {!loading && filteredAdjustments.length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="text-sm text-slate-700">
              <span className="font-semibold">{filteredAdjustments.length}</span> adjustment
              {filteredAdjustments.length !== 1 ? 's' : ''} found
              {searchTerm && <span> matching "{searchTerm}"</span>}
              <span className="mx-2">·</span>
              <span className="font-semibold text-blue-600">
                {filteredAdjustments.reduce((sum, adj) => sum + adj.totalCreditsAdded, 0).toLocaleString()}
              </span>{' '}
              total credits added
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
