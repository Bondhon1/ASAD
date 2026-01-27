"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";
import { SERVICES, autoAssignServiceFromInstitute } from '@/lib/organizations';

interface User {
  id: string;
  email: string;
  fullName: string | null;
  username: string | null;
  status: string;
  role: string;
  volunteerId: string | null;
  institute: { name: string } | null;
  volunteerProfile?: { points?: number; isOfficial?: boolean; rank?: string | null; service?: { id?: string; name?: string | null } | null; sectors?: string[]; clubs?: string[] } | null;
  initialPayment?: { status: string; verifiedAt?: string | null; approvedBy?: { id: string; fullName?: string | null; email?: string | null } } | null;
  finalPayment?: { status: string; verifiedAt?: string | null; approvedBy?: { id: string; fullName?: string | null; email?: string | null } } | null;
  interviewApprovedBy?: { id: string; fullName?: string | null; email?: string | null } | null;
  taskSubmissions?: Array<any>;
  donations?: Array<any>;
  followersCount?: number;
  followingCount?: number;
}

export default function UsersManagementPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email || (typeof window !== "undefined" ? localStorage.getItem("userEmail") : null);
  const { user: cachedUser, loading: userLoading, error: userError, refresh } = useCachedUserProfile<User>(userEmail);
  const [viewer, setViewer] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'ANY' | 'UNOFFICIAL' | 'OFFICIAL'>('OFFICIAL');
  const [stats, setStats] = useState<{ total?: number; officialCount?: number; rankCounts?: Array<{ rank: string; count: number }> }>({});
  // final payment date range filter (YYYY-MM-DD)
  const [finalFrom, setFinalFrom] = useState<string>('');
  const [finalTo, setFinalTo] = useState<string>('');
  const [editingVolunteerUserId, setEditingVolunteerUserId] = useState<string | null>(null);
  const [volunteerIdInput, setVolunteerIdInput] = useState<string>('');
  const [editingVolunteerSaving, setEditingVolunteerSaving] = useState(false);
  const [editingRoleUserId, setEditingRoleUserId] = useState<string | null>(null);
  const [roleInput, setRoleInput] = useState<string>('');
  const [editingRoleSaving, setEditingRoleSaving] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  const isCheckingAuth = status === "loading" || !authChecked;
  const isLoading = loading || isCheckingAuth;
  const skeletonPage = (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded" />
      <div className="h-10 w-full bg-gray-200 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded" />
        ))}
      </div>
    </div>
  );
  const displayName = viewer?.fullName || viewer?.username || session?.user?.name || "HR";
  const displayEmail = viewer?.email || session?.user?.email || "";
  const displayRole = (session as any)?.user?.role || (viewer?.role as "VOLUNTEER" | "HR" | "MASTER" | "ADMIN" | "DIRECTOR" | "DATABASE_DEPT" | "SECRETARIES") || "HR";
  const [showPointsForm, setShowPointsForm] = useState(false);
  const [showRankForm, setShowRankForm] = useState(false);
  const [editingOrgUserId, setEditingOrgUserId] = useState<string | null>(null);
  const [selectedServiceLocal, setSelectedServiceLocal] = useState<string | null>(null);
  const [selectedSectorsLocal, setSelectedSectorsLocal] = useState<string[]>([]);
  const [selectedClubsLocal, setSelectedClubsLocal] = useState<string[]>([]);
  const [editingOrgSaving, setEditingOrgSaving] = useState(false);
  const [servicesList, setServicesList] = useState<Array<{id:string;name:string;}>>([]);
  const [sectorsList, setSectorsList] = useState<Array<{id:string;name:string;}>>([]);
  const [clubsList, setClubsList] = useState<Array<{id:string;name:string;}>>([]);
  const [pointsInput, setPointsInput] = useState<number | ''>('');
  const [rankInput, setRankInput] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [ranksList, setRanksList] = useState<Array<{id:string;name:string;selectable?:boolean}>>([]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    if (!authChecked) return () => { controller.abort(); };

    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/hr/users/stats`, { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        if (!active) return;
        setStats({ total: data.total, officialCount: data.officialCount, rankCounts: data.rankCounts });
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Failed to load stats', err);
      }
    };

    // fetch sectors/clubs concurrently
    const fetchOrgs = async () => {
      try {
        const res = await fetch('/api/orgs', { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        if (!active) return;
        setSectorsList(Array.isArray(data.sectors) ? data.sectors : []);
        setClubsList(Array.isArray(data.clubs) ? data.clubs : []);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Failed to load org lists', err);
      }
    };

    const fetchRanks = async () => {
      try {
        const res = await fetch('/api/hr/ranks', { signal: controller.signal });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        if (!active) return;
        // API returns full `ranks` (in DB order) and optionally `dropdownRanks`.
        // Use `ranks` (DB order) for dropdowns so the UI matches database order exactly.
        setRanksList(data.ranks || data.dropdownRanks || []);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Failed to load ranks', err);
      }
    };

    fetchStats();
    fetchOrgs();
    fetchRanks();
    return () => { active = false; controller.abort(); };
  }, [authChecked]);

  // Helper to refresh stats after actions
  const refreshStats = async () => {
    try {
      const res = await fetch(`/api/hr/users/stats`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setStats({ total: data.total, officialCount: data.officialCount, rankCounts: data.rankCounts });
    } catch (e) {
      // ignore
    }
  };

  // handle volunteerId save from list
  const saveVolunteerId = async (userId: string) => {
    setEditingVolunteerSaving(true);
    try {
      const res = await fetch(`/api/hr/users/${userId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ volunteerId: volunteerIdInput === '' ? null : volunteerIdInput }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save volunteerId');
      // update local list
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, volunteerId: volunteerIdInput || null } : u));
      setSelected(prev => prev ? { ...prev, volunteerId: volunteerIdInput || null } : prev);
      setEditingVolunteerUserId(null);
    } catch (err: any) {
      alert(err?.message || 'Error saving volunteerId');
    } finally { setEditingVolunteerSaving(false); }
  };

    useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.replace("/auth");
      setAuthChecked(true);
      return;
    }

    if (!userEmail) {
      setAuthError("You do not have permission to view this page.");
      setAuthChecked(true);
      router.replace("/auth");
      return;
    }

    if (userError) {
      setAuthError(userError || "Unable to verify your access");
      setAuthChecked(true);
      router.replace("/auth");
      return;
    }

    if (userLoading) return;

    if (!cachedUser) {
      refresh();
      return;
    }

    if (!['HR', 'MASTER', 'ADMIN', 'DIRECTOR'].includes(cachedUser.role)) {
      setAuthError("You do not have permission to view this page.");
      router.replace("/dashboard");
      return;
    }

    setViewer(cachedUser);
    setAuthChecked(true);
  }, [status, router, userEmail, cachedUser, userLoading, userError, refresh]);

  // debounce query input to avoid firing on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/hr/services');
        if (!res.ok) return;
        const d = await res.json();
        setServicesList(d.services || []);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    if (!authChecked) return () => { controller.abort(); };

    const fetchUsers = async () => {
      try {
        // keep full-page loading only for the very first load; subsequent requests show inline list loading
        if (loading) {
          setLoading(true);
        } else {
          setListLoading(true);
        }

        const qParam = encodeURIComponent(debouncedQuery || '');
        const statusParam = statusFilter === 'ANY' ? '' : `status=${statusFilter}`;
        const finalFromParam = finalFrom ? `finalFrom=${encodeURIComponent(finalFrom)}` : '';
        const finalToParam = finalTo ? `finalTo=${encodeURIComponent(finalTo)}` : '';
        const dateParams = [finalFromParam, finalToParam].filter(Boolean).join('&');
        const res = await fetch(`/api/hr/users?${statusParam ? statusParam + '&' : ''}page=${page}&pageSize=${pageSize}&q=${qParam}${dateParams ? '&' + dateParams : ''}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        if (!active) return;
        setUsers(Array.isArray(data.users) ? data.users : data.users ?? []);
        setTotal(typeof data.total === 'number' ? data.total : 0);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Failed to load users');
      } finally {
        if (active) {
          setLoading(false);
          setListLoading(false);
        }
      }
    };

    fetchUsers();

    return () => {
      active = false;
      controller.abort();
    };
  }, [page, pageSize, debouncedQuery, statusFilter, authChecked]);
  // Re-fetch when date filters change (applies only for OFFICIAL filter)
  useEffect(() => {
    // reset page when date range changes
    setPage(1);
  }, [finalFrom, finalTo]);

  if (status === "unauthenticated") return null;
  if (authError) return null;

  // API returns users already filtered by status=UNOFFICIAL & isOfficial=true
  // Apply client-side final payment verifiedAt date-range filter when OFFICIAL is selected
  const filtered = users.filter(u => {
    if (statusFilter === 'OFFICIAL' && (finalFrom || finalTo)) {
      const v = (u as any).finalPayment?.verifiedAt;
      if (!v) return false;
      const d = new Date(v);
      if (finalFrom) {
        const sf = new Date(finalFrom);
        if (!isNaN(sf.getTime()) && d < sf) return false;
      }
      if (finalTo) {
        const tf = new Date(finalTo);
        if (!isNaN(tf.getTime())) {
          tf.setHours(23,59,59,999);
          if (d > tf) return false;
        }
      }
    }
    return true;
  });

  const grouped = filtered.reduce<Record<string, User[]>>((acc, u) => {
    const key = u.role || 'UNKNOWN';
    if (!acc[key]) acc[key] = [];
    acc[key].push(u);
    return acc;
  }, {});

  return (
    <DashboardLayout
      userRole={displayRole}
      userName={displayName}
      userEmail={displayEmail}
      userId={viewer?.id || ""}
      initialUserStatus={viewer?.status}
      initialFinalPaymentStatus={(viewer as any)?.finalPayment?.status}
    >
      {(status === "loading" || !authChecked || (loading && users.length === 0)) ? (
        skeletonPage
      ) : (
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h2 className="text-2xl font-semibold text-[#0b2545] mb-4">User Management</h2>

          {/* Top stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
              <div className="text-xs text-gray-500">Total users</div>
              <div className="text-2xl font-bold text-[#0b2545]">{stats.total ?? total}</div>
            </div>
            <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
              <div className="text-xs text-gray-500">OFFICIAL members</div>
              <div className="text-2xl font-bold text-green-700">{stats.officialCount ?? filtered.filter(u => u.status === 'OFFICIAL' || u.volunteerProfile?.isOfficial).length}</div>
            </div>
            <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
              <div className="text-xs text-gray-500">Top ranks</div>
              <div className="text-sm mt-2 text-gray-700">
                {stats.rankCounts && stats.rankCounts.length > 0 ? (
                  stats.rankCounts.slice(0,4).map(r => <div key={r.rank} className="flex items-center justify-between"><span className="truncate">{r.rank}</span><span className="ml-2 text-xs text-gray-500">{r.count}</span></div>)
                ) : (
                  (() => {
                    const rankCounts: Record<string, number> = {};
                    filtered.forEach(u => {
                      const r = (u.volunteerProfile?.rank || '—') as string;
                      rankCounts[r] = (rankCounts[r] || 0) + 1;
                    });
                    const entries = Object.entries(rankCounts).sort((a, b) => b[1] - a[1]).slice(0,4);
                    return entries.map(([r,c]) => <div key={r} className="flex items-center justify-between"><span className="truncate">{r}</span><span className="ml-2 text-xs text-gray-500">{c}</span></div>);
                  })()
                )}
              </div>
            </div>
          </div>

          <div className="mb-4 bg-white border border-gray-100 rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1">
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                placeholder="Search by name, email, or volunteer ID"
                className="px-3 py-2 border rounded-md w-full md:max-w-md"
              />
              {listLoading && <div className="text-sm text-gray-500 mt-2">Searching…</div>}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Status</label>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }} className="border rounded px-2 py-1">
                  <option value="ANY">Any</option>
                  <option value="UNOFFICIAL">Unofficial</option>
                  <option value="OFFICIAL">Official</option>
                  <option value="BANNED">Banned</option>
                </select>
              </div>

              {statusFilter === 'OFFICIAL' && (
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Final verified</label>
                    <input type="date" value={finalFrom} onChange={(e) => { setFinalFrom(e.target.value); setPage(1); }} className="border rounded px-2 py-1" />
                    <span className="text-sm text-gray-500">to</span>
                    <input type="date" value={finalTo} onChange={(e) => { setFinalTo(e.target.value); setPage(1); }} className="border rounded px-2 py-1" />
                    <button onClick={() => { setFinalFrom(''); setFinalTo(''); setPage(1); }} className="px-2 py-1 border rounded text-sm">Clear</button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Page size</label>
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border rounded px-2 py-1">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>

        {/* Debug summary removed */}
  {error && <div className="text-sm text-red-600">{error}</div>}

  {!error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              {Object.keys(grouped).length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-lg p-6">No matching users found.</div>
              ) : (
                Object.entries(grouped).map(([role, list]) => (
                  <div key={role} className="mb-6">
                    <div className="text-sm font-medium text-[#0b2545] mb-2">Role: {role} ({list.length})</div>
                    <div className="space-y-2">
                      {list.map(u => (
                        <div key={u.id} className="w-full">
                          <button onClick={() => setSelected(selected?.id === u.id ? null : u)} className="w-full text-left bg-white border border-gray-100 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-gray-700">{(u.fullName || u.username || u.email || '').charAt(0).toUpperCase()}</div>
                              <div>
                                <div className="font-semibold text-gray-900">{u.fullName || u.username || u.email}</div>
                                <div className="text-xs text-gray-500">{u.email} · ID: {u.volunteerId || '—'}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="ml-4">
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-800">{u.volunteerProfile?.rank ?? '—'}</span>
                              </div>
                            </div>
                          </button>

                          {selected?.id === u.id && (
                            <div className="mt-2 bg-white border border-gray-100 rounded-lg p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 text-sm">
                                  <div className="text-gray-700 font-semibold">{u.fullName || u.username || u.email}</div>
                                  <div className="text-xs text-gray-500">Email: {u.email}</div>
                                  <div className="text-xs text-gray-500">Role: {u.role}</div>
                                  <div className="text-xs mt-1">
                                    {editingRoleUserId === u.id ? (
                                      <div className="flex items-center gap-2">
                                        <select value={roleInput} onChange={(e) => setRoleInput(e.target.value)} className="px-2 py-1 border rounded">
                                          <option value="VOLUNTEER">VOLUNTEER</option>
                                          <option value="HR">HR</option>
                                          <option value="DIRECTOR">DIRECTOR</option>
                                          <option value="DATABASE_DEPT">Database Dept</option>
                                          <option value="SECRETARIES">Secretaries</option>
                                          <option value="ADMIN">ADMIN</option>
                                        </select>
                                        <button disabled={editingRoleSaving} onClick={async () => {
                                          setEditingRoleSaving(true);
                                          try {
                                            const res = await fetch(`/api/hr/users/${u.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: roleInput }) });
                                            const data = await res.json();
                                            if (!res.ok) throw new Error(data?.error || 'Failed to update role');
                                            setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: data.user.role } : x));
                                            setSelected(prev => prev ? { ...prev, role: data.user.role } : prev);
                                            setEditingRoleUserId(null);
                                          } catch (err: any) {
                                            alert(err?.message || 'Error updating role');
                                          } finally { setEditingRoleSaving(false); }
                                        }} className="px-2 py-1 bg-[#1E90FF] text-white rounded">Save</button>
                                        <button onClick={() => { setEditingRoleUserId(null); setRoleInput(''); }} className="px-2 py-1 border rounded">Cancel</button>
                                      </div>
                                    ) : (
                                      (displayRole === 'ADMIN' || displayRole === 'MASTER') && u.status === 'OFFICIAL' && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-gray-700">{u.role}</span>
                                          <button onClick={() => { setEditingRoleUserId(u.id); setRoleInput(u.role || 'VOLUNTEER'); }} className="px-2 py-1 text-xs bg-gray-100 rounded">Edit role</button>
                                        </div>
                                      )
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">Status: {u.status}</div>
                                  <div className="text-xs text-gray-500">Institute: {u.institute?.name || 'Independent'}</div>
                                  <div className="text-xs text-gray-500">Volunteer ID:
                                    <span className="ml-1">
                                      {editingVolunteerUserId === u.id ? (
                                        <span className="flex items-center gap-2">
                                          <input value={volunteerIdInput} onChange={(e) => setVolunteerIdInput(e.target.value)} className="px-2 py-1 border rounded w-40" />
                                          <button disabled={editingVolunteerSaving} onClick={() => saveVolunteerId(u.id)} className="px-2 py-1 bg-[#1E90FF] text-white rounded">Save</button>
                                          <button onClick={() => { setEditingVolunteerUserId(null); setVolunteerIdInput(''); }} className="px-2 py-1 border rounded">Cancel</button>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-2">
                                          <span>{u.volunteerId || '—'}</span>
                                          {(displayRole === 'HR' || displayRole === 'MASTER' || displayRole === 'ADMIN') && u.status === 'OFFICIAL' && (
                                            <button onClick={() => { setEditingVolunteerUserId(u.id); setVolunteerIdInput(u.volunteerId || ''); }} className="px-2 py-1 text-xs bg-gray-100 rounded">Edit</button>
                                          )}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500">Points: {u.volunteerProfile?.points ?? 0}</div>
                                  <div className="text-xs text-gray-500">Rank: {u.volunteerProfile?.rank ?? '—'}</div>

                                  {/* Service / Sectors / Clubs as tag-like buttons */}
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {u.volunteerProfile?.service ? (
                                      <span className="px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-800">{u.volunteerProfile.service?.name}</span>
                                    ) : null}

                                    {(u.volunteerProfile?.sectors || []).length > 0 ? (
                                      (u.volunteerProfile?.sectors || []).map(s => (
                                        <span key={`sector-${s}`} className="px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-800">{sectorsList.find(x=>x.id===s)?.name || s}</span>
                                      ))
                                    ) : null}

                                    {(u.volunteerProfile?.clubs || []).length > 0 ? (
                                      (u.volunteerProfile?.clubs || []).map(c => (
                                        <span key={`club-${c}`} className="px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-800">{clubsList.find(x=>x.id===c)?.name || c}</span>
                                      ))
                                    ) : null}

                                    {(!u.volunteerProfile?.service && !(u.volunteerProfile?.sectors || []).length && !(u.volunteerProfile?.clubs || []).length) && (
                                      <span className="text-xs text-gray-500">—</span>
                                    )}
                                  </div>
                                  {u.volunteerProfile?.isOfficial && <div className="text-xs text-green-700 font-medium">Official member</div>}
                                </div>

                                <div className="space-y-3">
                                  { (u.status === 'OFFICIAL' || u.volunteerProfile?.isOfficial) && (displayRole === 'HR' || displayRole === 'MASTER' || displayRole === 'ADMIN') && (
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 flex-wrap">
                                      <button onClick={() => { setShowRankForm(s => !s); setRankInput(u.volunteerProfile?.rank || ''); setSelected(u); }} className="px-3 py-1 bg-[#0b2545] text-white rounded flex-shrink-0">Set Rank</button>
                                      <button onClick={() => { setShowPointsForm(s => !s); setPointsInput(u.volunteerProfile?.points ?? 0); setSelected(u); }} className="px-3 py-1 bg-gray-100 text-gray-800 rounded flex-shrink-0">Set Points</button>
                                    </div>
                                  )}

                                  {selected && selected.id === u.id && showPointsForm && (
                                    <div className="p-3 bg-gray-50 border rounded">
                                      <label className="text-xs">Points</label>
                                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                                          <input type="number" value={pointsInput as any} onChange={(e) => setPointsInput(e.target.value === '' ? '' : Number(e.target.value))} className="px-2 py-1 border rounded w-28 min-w-0" />
                                          <button disabled={saving} onClick={async () => {
                                          if (!selected) return;
                                          setSaving(true);
                                          try {
                                            const res = await fetch(`/api/hr/users/${selected.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ points: pointsInput === '' ? undefined : Number(pointsInput) }) });
                                            const data = await res.json();
                                            if (!res.ok) throw new Error(data?.error || 'Failed');
                                            // update local users list
                                            setUsers(prev => prev.map(x => x.id === selected.id ? { ...x, volunteerProfile: { ...(x.volunteerProfile || {}), points: data.profile.points, rank: data.profile.rank ? data.profile.rank.name ?? data.profile.rank : data.profile.rank } } : x));
                                            setSelected(prev => prev ? { ...prev, volunteerProfile: { ...(prev.volunteerProfile || {}), points: data.profile.points, rank: data.profile.rank ? data.profile.rank.name ?? data.profile.rank : data.profile.rank } } : prev);
                                              setShowPointsForm(false);
                                          } catch (err: any) {
                                            console.error(err);
                                            alert(err?.message || 'Error saving points');
                                          } finally { setSaving(false); }
                                          }} className="px-3 py-1 bg-[#1E90FF] text-white rounded flex-shrink-0">Save</button>
                                          <button onClick={() => setShowPointsForm(false)} className="px-3 py-1 border rounded flex-shrink-0">Cancel</button>
                                      </div>
                                    </div>
                                  )}

                                  {selected && selected.id === u.id && showRankForm && (
                                    <div className="p-3 bg-gray-50 border rounded">
                                      <label className="text-xs">Rank</label>
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        <select value={rankInput} onChange={(e) => setRankInput(e.target.value)} className="px-2 py-1 border rounded min-w-0">
                                          <option value="">-- Select rank --</option>
                                          {ranksList.filter(r => r.selectable !== false).map(r => (
                                            <option key={r.id} value={r.name}>{r.name}</option>
                                          ))}
                                        </select>
                                        <button disabled={saving} onClick={async () => {
                                          if (!selected) return;
                                          setSaving(true);
                                          try {
                                            const res = await fetch(`/api/hr/users/${selected.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rank: rankInput || undefined }) });
                                            const data = await res.json();
                                            if (!res.ok) throw new Error(data?.error || 'Failed');
                                            const rankName = data.profile.rank ? data.profile.rank.name ?? data.profile.rank : data.profile.rank;
                                            setUsers(prev => prev.map(x => x.id === selected.id ? { ...x, volunteerProfile: { ...(x.volunteerProfile || {}), points: data.profile.points, rank: rankName } } : x));
                                            setSelected(prev => prev ? { ...prev, volunteerProfile: { ...(prev.volunteerProfile || {}), points: data.profile.points, rank: rankName } } : prev);
                                            setShowRankForm(false);
                                          } catch (err: any) {
                                            console.error(err);
                                            alert(err?.message || 'Error saving rank');
                                          } finally { setSaving(false); }
                                        }} className="px-3 py-1 bg-[#1E90FF] text-white rounded flex-shrink-0">Save</button>
                                        <button onClick={() => setShowRankForm(false)} className="px-3 py-1 border rounded flex-shrink-0">Cancel</button>
                                      </div>
                                    </div>
                                  )}
                                  {/* Payment & management actions */}
                                  <div className="mt-2 space-y-2">
                                    <div className="text-xs text-gray-500">Initial payment: {u.initialPayment?.status ?? '—'}</div>
                                    <div className="text-xs text-gray-500">Final payment: {(u as any).finalPayment?.status ?? '—'}</div>
                                    <div className="text-xs text-gray-500">Initial approved by: {(u as any).initialPayment?.approvedBy?.fullName || (u as any).initialPayment?.approvedBy?.email || '—'}</div>
                                    <div className="text-xs text-gray-500">Initial approved at: {(u as any).initialPayment?.verifiedAt ? new Date((u as any).initialPayment.verifiedAt).toLocaleString() : '—'}</div>
                                    <div className="text-xs text-gray-500">Final approved by: {(u as any).finalPayment?.approvedBy?.fullName || (u as any).finalPayment?.approvedBy?.email || '—'}</div>
                                    <div className="text-xs text-gray-500">Final approved at: {(u as any).finalPayment?.verifiedAt ? new Date((u as any).finalPayment.verifiedAt).toLocaleString() : '—'}</div>
                                    <div className="text-xs text-gray-500">Interview approved by: {(u as any).interviewApprovedBy?.fullName || (u as any).interviewApprovedBy?.email || '—'}</div>

                                    {/* Manage route removed; editing handled inline */}
                                  </div>
                                  {/* Service / Sector / Club management */}
                                  <div className="mt-3">
                                    {(displayRole === 'DIRECTOR' || displayRole === 'MASTER' || displayRole === 'HR' || displayRole === 'ADMIN') && (
                                      <div className="text-sm font-medium mb-2">Service / Sector / Club</div>
                                    )}
                                    {editingOrgUserId === u.id ? (
                                      <div className="space-y-3">
                                        { (displayRole === 'HR' || displayRole === 'MASTER' || displayRole === 'ADMIN') && (
                                          <div>
                                            <div className="text-xs text-gray-600">Service</div>
                                            <div className="mt-2">
                                              <select value={selectedServiceLocal || ''} onChange={(e) => setSelectedServiceLocal(e.target.value || null)} className="px-3 py-2 border rounded w-full">
                                                <option value="">-- none --</option>
                                                {servicesList.map(s => (
                                                  <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                              </select>
                                            </div>
                                          </div>
                                        )}

                                        {(displayRole === 'DIRECTOR' || displayRole === 'MASTER') && (
                                          <>
                                            <div>
                                              <div className="text-xs text-gray-600">Sectors</div>
                                              <div className="flex gap-2 mt-2 flex-wrap">
                                                {sectorsList.map(s => (
                                                  <button
                                                    key={s.id}
                                                    onClick={() => setSelectedSectorsLocal(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                                                    className={`px-3 py-1 rounded ${selectedSectorsLocal.includes(s.id) ? 'bg-[#0b2545] text-white' : 'bg-gray-100 text-gray-800'}`}
                                                  >
                                                    {s.name}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>

                                            <div>
                                              <div className="text-xs text-gray-600">Clubs</div>
                                              <div className="flex gap-2 mt-2 flex-wrap">
                                                {clubsList.map(c => (
                                                  <button
                                                    key={c.id}
                                                    onClick={() => setSelectedClubsLocal(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                                                    className={`px-3 py-1 rounded ${selectedClubsLocal.includes(c.id) ? 'bg-[#0b2545] text-white' : 'bg-gray-100 text-gray-800'}`}
                                                  >
                                                    {c.name}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>
                                          </>
                                        )}

                                        <div className="flex gap-2 mt-2">
                                          <button disabled={editingOrgSaving} onClick={async () => {
                                            setEditingOrgSaving(true);
                                            try {
                                              const payload: any = {};
                                              // only include serviceId when viewer is allowed to update service
                                              if (displayRole === 'HR' || displayRole === 'MASTER' || displayRole === 'ADMIN') {
                                                payload.serviceId = selectedServiceLocal;
                                              }
                                              // only include sectors/clubs when viewer is allowed to update them
                                              if (displayRole === 'DIRECTOR' || displayRole === 'MASTER' || displayRole === 'ADMIN') {
                                                payload.sectors = selectedSectorsLocal;
                                                payload.clubs = selectedClubsLocal;
                                              }
                                              const res = await fetch(`/api/hr/users/${u.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
                                              const data = await res.json();
                                              if (!res.ok) throw new Error(data?.error || 'Failed to save');
                                              const svcName = servicesList.find(s => s.id === selectedServiceLocal)?.name || null;
                                              // update local user entry
                                              setUsers(prev => prev.map(x => x.id === u.id ? { ...x, volunteerProfile: { ...(x.volunteerProfile || {}), service: (displayRole === 'HR' || displayRole === 'MASTER' || displayRole === 'ADMIN') ? (selectedServiceLocal ? { id: selectedServiceLocal, name: svcName } : null) : x.volunteerProfile?.service, sectors: selectedSectorsLocal, clubs: selectedClubsLocal } } : x));
                                              setSelected(prev => prev ? { ...prev, volunteerProfile: { ...(prev.volunteerProfile || {}), service: (displayRole === 'HR' || displayRole === 'MASTER' || displayRole === 'ADMIN') ? (selectedServiceLocal ? { id: selectedServiceLocal, name: svcName } : null) : prev.volunteerProfile?.service, sectors: selectedSectorsLocal, clubs: selectedClubsLocal } } : prev);
                                              setEditingOrgUserId(null);
                                            } catch (err: any) {
                                              alert(err?.message || 'Error saving');
                                            } finally { setEditingOrgSaving(false); }
                                          }} className="px-3 py-1 bg-[#1E90FF] text-white rounded">Save</button>
                                          <button onClick={() => setEditingOrgUserId(null)} className="px-3 py-1 border rounded">Cancel</button>
                                        </div>
                                      </div>
                                    ) : (
                                      (displayRole === 'DIRECTOR' || displayRole === 'MASTER' || displayRole === 'HR' || displayRole === 'ADMIN') && (u.status === 'OFFICIAL' || u.volunteerProfile?.isOfficial) && (
                                        <div className="flex items-center gap-2">
                                          <button onClick={() => {
                                            setEditingOrgUserId(u.id);
                                            setSelectedServiceLocal(u.volunteerProfile?.service?.id || autoAssignServiceFromInstitute(u.institute?.name) || null);
                                            setSelectedSectorsLocal(Array.isArray(u.volunteerProfile?.sectors) ? (u.volunteerProfile?.sectors as string[]) : []);
                                            setSelectedClubsLocal(Array.isArray(u.volunteerProfile?.clubs) ? (u.volunteerProfile?.clubs as string[]) : []);
                                          }} className="px-2 py-1 text-xs bg-gray-100 rounded">Edit Service/Sectors/Clubs</button>
                                        </div>
                                      )
                                    )}
                                  </div>
                                  {(displayRole === 'HR' || displayRole === 'MASTER' || displayRole === 'ADMIN') && (
                                    <div className="mt-2 flex gap-2">
                                      {u.status === 'BANNED' ? (
                                        <button disabled={actionLoading} onClick={async () => {
                                          if (!confirm('Unban this user?')) return;
                                          setActionLoading(true);
                                          try {
                                            const res = await fetch(`/api/hr/users/${u.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'APPLICANT' }) });
                                            const data = await res.json();
                                            if (!res.ok) throw new Error(data?.error || 'Failed to unban');
                                            setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: 'APPLICANT' } : x));
                                            setSelected(prev => prev ? { ...prev, status: 'APPLICANT' } : prev);
                                            await refreshStats();
                                          } catch (err: any) {
                                            alert(err?.message || 'Error');
                                          } finally { setActionLoading(false); }
                                        }} className="px-3 py-1 bg-green-600 text-white rounded">Unban</button>
                                      ) : (
                                        <button disabled={actionLoading} onClick={async () => {
                                          if (!confirm('Ban this user? They will be immediately logged out.')) return;
                                          setActionLoading(true);
                                          try {
                                            const res = await fetch(`/api/hr/users/${u.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'BANNED' }) });
                                            const data = await res.json();
                                            if (!res.ok) throw new Error(data?.error || 'Failed to ban');
                                            setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: 'BANNED' } : x));
                                            setSelected(prev => prev ? { ...prev, status: 'BANNED' } : prev);
                                            await refreshStats();
                                          } catch (err: any) {
                                            alert(err?.message || 'Error');
                                          } finally { setActionLoading(false); }
                                        }} className="px-3 py-1 bg-red-600 text-white rounded">Ban</button>
                                      )}

                                      <button disabled={actionLoading} onClick={async () => {
                                        if (!confirm('Delete this user and all related data? This cannot be undone.')) return;
                                        setActionLoading(true);
                                        try {
                                          const res = await fetch(`/api/hr/users/${u.id}`, { method: 'DELETE' });
                                          const data = await res.json();
                                          if (!res.ok) throw new Error(data?.error || 'Failed to delete');
                                          setUsers(prev => prev.filter(x => x.id !== u.id));
                                          setSelected(null);
                                          await refreshStats();
                                        } catch (err: any) {
                                          alert(err?.message || 'Error');
                                        } finally { setActionLoading(false); }
                                      }} className="px-3 py-1 border rounded">Delete</button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
              {/* Pagination controls */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">Showing {Math.min((page - 1) * pageSize + 1, total || 0)} - {Math.min(page * pageSize, total || 0)} of {total}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
                  <div className="text-sm">Page {page}</div>
                  <button onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= total} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
                </div>
              </div>
            </div>

            
          </div>
        )}
        </div>
      )}
    </DashboardLayout>
  );
}
