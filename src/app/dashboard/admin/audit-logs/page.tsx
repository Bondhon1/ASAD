"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";
import { formatShortDhakaDateTime } from "@/lib/dateUtils";

interface AuditLog {
  id: string;
  action: string;
  meta: string | null;
  createdAt: string;
  actor: {
    id: string;
    fullName: string | null;
    email: string;
    volunteerId: string | null;
    role: string;
  };
  affectedVolunteerId?: string | null;
  points?: number | null;
}

export default function AuditLogsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email || (typeof window !== "undefined" ? localStorage.getItem("userEmail") : null);
  const { user, loading: userLoading, error: userError, refresh } = useCachedUserProfile<any>(userEmail);
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  
  // Filters
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [resolvedVolunteers, setResolvedVolunteers] = useState<Record<string, { email?: string; fullName?: string }>>({});

  const displayName = user?.fullName || user?.username || session?.user?.name || "Admin";
  const displayEmail = user?.email || session?.user?.email || "";
  const displayRole = (session as any)?.user?.role || (user?.role as "VOLUNTEER" | "HR" | "MASTER" | "ADMIN" | "DIRECTOR" | "DATABASE_DEPT" | "SECRETARIES") || "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth");
      return;
    }

    if (!user && !userLoading && !userError) {
      refresh();
      return;
    }

    if (user && !['MASTER', 'ADMIN'].includes(user.role)) {
      router.push("/dashboard");
      return;
    }
  }, [status, user, userLoading, userError, refresh, router]);

  useEffect(() => {
    if (!user || userLoading) return;
    if (!['MASTER', 'ADMIN'].includes(user.role)) return;

    fetchLogs();
  }, [user, userLoading, page, pageSize, actionFilter, startDate, endDate]);

  const getVisiblePages = () => {
    const delta = 4;
    const start = Math.max(1, page - delta);
    const end = Math.min(totalPages || 1, page + delta);
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      
      if (actionFilter && actionFilter !== 'ALL') {
        params.append('action', actionFilter);
      }
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch logs');
      }

      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
      setActionTypes(data.actionTypes || []);

      // Resolve affected volunteer IDs to user info (email/fullName) when possible
      try {
        const ids = new Set<string>();
        (data.logs || []).forEach((l: any) => {
          if (l.affectedVolunteerId) ids.add(l.affectedVolunteerId);
          try {
            const m = l.meta ? JSON.parse(l.meta) : null;
            const candidate = m?.volunteerId || m?.volunteer_id || m?.userId || m?.user_id || m?.affectedVolunteerId;
            if (candidate) ids.add(candidate);
          } catch (e) {
            // ignore meta parse errors
          }
        });

        const idArray = Array.from(ids).filter(Boolean);
        if (idArray.length > 0) {
          const pairs: Array<[string, { email?: string; fullName?: string } | null]> = await Promise.all(idArray.map(async (vid) => {
            try {
              const r = await fetch(`/api/hr/users?q=${encodeURIComponent(vid)}&pageSize=1`);
              if (!r.ok) return [vid, null] as const;
              const d = await r.json();
              const u = Array.isArray(d.users) && d.users.length > 0 ? d.users[0] : null;
              if (u) return [vid, { email: u.email, fullName: u.fullName } as { email?: string; fullName?: string }];
            } catch (e) {
              // ignore individual lookup errors
            }
            return [vid, null] as [string, null];
          }));

          const map: Record<string, { email?: string; fullName?: string }> = {};
          pairs.forEach(([k, v]) => { if (v) map[String(k)] = v; });
          setResolvedVolunteers(map);
        }
      } catch (e) {
        // ignore resolution errors
      }
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err);
      alert('Failed to load audit logs: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = () => {
    setPage(1); // Reset to first page when filters change
  };

  const toggleExpandLog = (logId: string) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  const parseMeta = (meta: string | null): any => {
    if (!meta) return null;
    try {
      return JSON.parse(meta);
    } catch {
      return null;
    }
  };

  const getVolunteerDisplay = (idOrNull: string | null) => {
    if (!idOrNull) return '—';
    const key = String(idOrNull);
    const resolved = resolvedVolunteers[key];
    if (resolved) return resolved.fullName || resolved.email || key;
    return key;
  };

  const skeletonPage = (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded" />
      <div className="h-10 w-full bg-gray-200 rounded" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 bg-gray-200 rounded" />
        ))}
      </div>
    </div>
  );

  if (status === "loading" || userLoading || !user) {
    return skeletonPage;
  }

  if (!['MASTER', 'ADMIN'].includes(user.role)) {
    return null;
  }

  return (
    <DashboardLayout
      userRole={displayRole}
      userName={displayName}
      userEmail={displayEmail}
      userId={user?.id || ""}
      initialUserStatus={user?.status}
      initialFinalPaymentStatus={user?.finalPayment?.status}
    >
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-3xl font-bold mb-6">Audit Logs</h1>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); handleFilterChange(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Actions</option>
                {actionTypes.map((action) => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); handleFilterChange(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); handleFilterChange(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={() => { setActionFilter('ALL'); setStartDate(''); setEndDate(''); setPage(1); }}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Logs ({total} total)
            </h2>
            {totalPages > 1 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {getVisiblePages().map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-2 py-1 text-sm rounded ${p === page ? 'bg-blue-600 text-white' : 'border'}`}
                    >
                      {p}
                    </button>
                  ))}
                  {page + 5 < totalPages && (
                    <span className="px-2 text-sm">…</span>
                  )}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  Next
                </button>

                <div className="ml-4 flex items-center gap-2">
                  <label className="text-sm text-gray-600">Page size</label>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No logs found matching the selected filters.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const meta = parseMeta(log.meta);
                const isExpanded = expandedLog === log.id;

                return (
                  <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                            {log.action}
                          </span>
                          <span className="text-sm text-gray-600">
                            {formatShortDhakaDateTime(log.createdAt)}
                          </span>
                        </div>

                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Actor:</span> {log.actor.fullName || log.actor.email}
                                  {log.actor.volunteerId && (
                                    <span className="ml-2 text-xs text-gray-500">(ID: {log.actor.volunteerId})</span>
                                  )}
                                  <span className="ml-2 text-xs text-gray-500">[{log.actor.role}]</span>
                                </div>

                                {/* Action-specific summary fields */}
                                <div className="mt-2 text-sm text-gray-600">
                                  {log.action === 'TASK_CREATED' && (
                                    <div>
                                      <span className="font-medium">Points:</span> <span className="ml-1 text-gray-800">{log.points ?? meta?.points ?? '—'}</span>
                                      <span className="mx-2">•</span>
                                      <span className="font-medium">Targets:</span> <span className="ml-1 text-gray-800">{meta?.targetUsersCount ?? '—'}</span>
                                    </div>
                                  )}

                                  {log.action === 'MANUAL_POINTS_ADJUSTMENT' && (
                                    <div>
                                      <span className="font-medium">Points:</span> <span className="ml-1 text-gray-800">{log.points ?? meta?.points ?? '—'}</span>
                                      <span className="mx-2">•</span>
                                      <span className="font-medium">IDs:</span> <span className="ml-1 text-gray-800">{Array.isArray(meta?.ids) ? meta.ids.length : (meta?.ids ? String(meta.ids) : '—')}</span>
                                    </div>
                                  )}

                                  {(log.action === 'INITIAL_PAYMENT_APPROVED' || log.action === 'INITIAL_PAYMENT_REJECTED' || log.action === 'FINAL_PAYMENT_APPROVED' || log.action === 'FINAL_PAYMENT_REJECTED') && (
                                    <div>
                                      <span className="font-medium">Amount:</span> <span className="ml-1 text-gray-800">{meta?.amount ?? '—'}</span>
                                      <span className="mx-2">•</span>
                                      <span className="font-medium">Txn:</span> <span className="ml-1 text-gray-800">{meta?.trxId ?? '—'}</span>
                                      <span className="mx-2">•</span>
                                      <span className="font-medium">Volunteer ID:</span> <span className="ml-1 text-gray-800">{getVolunteerDisplay(log.affectedVolunteerId ?? meta?.volunteerId ?? null)}</span>
                                    </div>
                                  )}

                                  {(!['TASK_CREATED','MANUAL_POINTS_ADJUSTMENT','INITIAL_PAYMENT_APPROVED','INITIAL_PAYMENT_REJECTED','FINAL_PAYMENT_APPROVED','FINAL_PAYMENT_REJECTED'].includes(log.action)) && meta && (
                                    <div>
                                      <span className="font-medium">Affected Volunteer ID:</span>{' '}
                                      <span className="ml-1 text-gray-800">{getVolunteerDisplay((meta?.volunteerId || meta?.volunteer_id || meta?.userId || meta?.user_id || meta?.affectedVolunteerId) ?? null)}</span>
                                    </div>
                                  )}
                                </div>

                                {meta && isExpanded && (
                                  <div className="mt-3 p-3 bg-gray-100 rounded text-xs">
                                    <div className="font-semibold mb-2">Details</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                                      {Object.entries(meta).map(([k, v]) => (
                                        <div key={k} className="flex gap-2">
                                          <div className="w-36 text-gray-500">{k}:</div>
                                          <div className="break-all">{typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : JSON.stringify(v)}</div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                      </div>

                      {meta && (
                        <button
                          onClick={() => toggleExpandLog(log.id)}
                          className="ml-4 px-3 py-1 text-xs text-blue-600 hover:text-blue-800"
                        >
                          {isExpanded ? 'Hide' : 'Show'} Details
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
