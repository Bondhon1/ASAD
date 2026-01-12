"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";

interface User {
  id: string;
  email: string;
  fullName: string | null;
  username: string | null;
  status: string;
  role: string;
  volunteerId: string | null;
  institute: { name: string } | null;
  volunteerProfile?: { points: number; isOfficial?: boolean; rank?: string | null } | null;
  initialPayment?: { status: string } | null;
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
  const [statusFilter, setStatusFilter] = useState<'ANY' | 'UNOFFICIAL' | 'OFFICIAL'>('UNOFFICIAL');

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
  const displayRole = (session as any)?.user?.role || (viewer?.role as "VOLUNTEER" | "HR" | "MASTER") || "HR";
  const [showPointsForm, setShowPointsForm] = useState(false);
  const [showRankForm, setShowRankForm] = useState(false);
  const [pointsInput, setPointsInput] = useState<number | ''>('');
  const [rankInput, setRankInput] = useState<string>('');
  const [saving, setSaving] = useState(false);

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

    if (!['HR', 'MASTER'].includes(cachedUser.role)) {
      setAuthError("You do not have permission to view this page.");
      router.replace("/dashboard");
      return;
    }

    setViewer(cachedUser);
    setAuthChecked(true);
  }, [status, router, userEmail, cachedUser, userLoading, userError, refresh]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    if (!authChecked) return () => { controller.abort(); };

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const qParam = encodeURIComponent(query || '');
        const statusParam = statusFilter === 'ANY' ? '' : `status=${statusFilter}`;
        const res = await fetch(`/api/hr/users?${statusParam ? statusParam + '&' : ''}page=${page}&pageSize=${pageSize}&q=${qParam}`, {
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
        if (active) setLoading(false);
      }
    };

    fetchUsers();

    return () => {
      active = false;
      controller.abort();
    };
  }, [page, pageSize, query, statusFilter, authChecked]);

  if (status === "unauthenticated") return null;
  if (authError) return null;

  // API returns users already filtered by status=UNOFFICIAL & isOfficial=true
  const filtered = users;

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
      initialUserStatus={viewer?.status ?? null}
      initialFinalPaymentStatus={(viewer as any)?.finalPayment?.status ?? null}
    >
      {isLoading ? (
        skeletonPage
      ) : (
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h2 className="text-2xl font-semibold text-[#0b2545] mb-4">User Management</h2>

          <div className="mb-4 flex flex-col md:flex-row items-start md:items-center gap-3">
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search by name, email, or volunteer ID"
              className="px-3 py-2 border rounded-md w-full md:max-w-sm"
            />
            <label className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Status:</span>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }} className="border rounded px-2 py-1">
                <option value="ANY">Any</option>
                <option value="UNOFFICIAL">Unofficial (not OFFICIAL)</option>
                <option value="OFFICIAL">OFFICIAL</option>
              </select>
            </label>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Page size:</label>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border rounded px-2 py-1">
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
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
                                  <div className="text-xs text-gray-500">Status: {u.status}</div>
                                  <div className="text-xs text-gray-500">Institute: {u.institute?.name || 'Independent'}</div>
                                  <div className="text-xs text-gray-500">Volunteer ID: {u.volunteerId || '—'}</div>
                                  <div className="text-xs text-gray-500">Points: {u.volunteerProfile?.points ?? 0}</div>
                                  <div className="text-xs text-gray-500">Rank: {u.volunteerProfile?.rank ?? '—'}</div>
                                  {u.volunteerProfile?.isOfficial && <div className="text-xs text-green-700 font-medium">Official member</div>}
                                </div>

                                <div className="space-y-3">
                                  { (u.status === 'OFFICIAL' || u.volunteerProfile?.isOfficial) && (
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
                                          <option value="VOLUNTEER">VOLUNTEER</option>
                                          <option value="Aspiring Volunteer">Aspiring Volunteer</option>
                                          <option value="Ready to Serve (RS)">Ready to Serve (RS)</option>
                                          <option value="Mentor">Mentor</option>
                                          <option value="Dedicated Volunteer">Dedicated Volunteer</option>
                                          <option value="Dedicated Volunteer*">Dedicated Volunteer*</option>
                                          <option value="Dedicated Volunteer**">Dedicated Volunteer**</option>
                                          <option value="Ability to Lead (AL)">Ability to Lead (AL)</option>
                                          <option value="Ability to Lead (AL) *">Ability to Lead (AL) *</option>
                                          <option value="Ability to Lead (AL) **">Ability to Lead (AL) **</option>
                                          <option value="Ability to Lead (AL) ***">Ability to Lead (AL) ***</option>
                                          <option value="Deputy Commander (DC)">Deputy Commander (DC)</option>
                                          <option value="Deputy Commander (DC) *">Deputy Commander (DC) *</option>
                                          <option value="Deputy Commander (DC) **">Deputy Commander (DC) **</option>
                                          <option value="Commander">Commander</option>
                                          <option value="Commander *">Commander *</option>
                                          <option value="Commander **">Commander **</option>
                                          <option value="Commander ***">Commander ***</option>
                                          <option value="Asadian Star (AS) *">Asadian Star (AS) *</option>
                                          <option value="Asadian Star (AS) **">Asadian Star (AS) **</option>
                                          <option value="General Volunteer (GV)">General Volunteer (GV)</option>
                                          <option value="Senior Volunteer">Senior Volunteer</option>
                                          <option value="Senior Commander">Senior Commander</option>
                                          <option value="Community Builder">Community Builder</option>
                                          <option value="Strategic Leader">Strategic Leader</option>
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
