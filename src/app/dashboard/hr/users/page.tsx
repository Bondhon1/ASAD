"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

interface User {
  id: string;
  email: string;
  fullName: string | null;
  username: string | null;
  status: string;
  role: string;
  volunteerId: string | null;
  institute: { name: string } | null;
  volunteerProfile?: { points: number; isOfficial?: boolean } | null;
  initialPayment?: { status: string } | null;
  taskSubmissions?: Array<any>;
  donations?: Array<any>;
  followersCount?: number;
  followingCount?: number;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'ANY' | 'UNOFFICIAL' | 'OFFICIAL'>('UNOFFICIAL');

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const qParam = encodeURIComponent(query || '');
        const statusParam = statusFilter === 'ANY' ? '' : `status=${statusFilter}`;
        const res = await fetch(`/api/hr/users?${statusParam ? statusParam + '&' : ''}page=${page}&pageSize=${pageSize}&q=${qParam}`, { signal: controller.signal });
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

    // debounce quick query typing
    const t = setTimeout(() => {
      fetchUsers();
    }, 250);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(t);
    };
  }, [page, pageSize, query, statusFilter]);

  // API returns users already filtered by status=UNOFFICIAL & isOfficial=true
  const filtered = users;

  const grouped = filtered.reduce<Record<string, User[]>>((acc, u) => {
    const key = u.role || 'UNKNOWN';
    if (!acc[key]) acc[key] = [];
    acc[key].push(u);
    return acc;
  }, {});

  return (
    <DashboardLayout userRole={"HR" as any} userName={"HR"} userEmail={"hr@example.com"}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-semibold text-[#0b2545] mb-4">User Management — Unofficial (Official category)</h2>

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

        {loading && <div className="text-sm text-gray-600">Loading users...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}

        {!loading && !error && (
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
                        <button key={u.id} onClick={() => setSelected(u)} className="w-full text-left bg-white border border-gray-100 rounded-lg p-4 flex items-center justify-between hover:shadow-sm">
                          <div>
                            <div className="font-semibold text-gray-900">{u.fullName || u.username || u.email}</div>
                            <div className="text-xs text-gray-500">{u.email} · ID: {u.volunteerId || '—'}</div>
                          </div>
                          <div className="text-xs text-gray-500">Points: {u.volunteerProfile?.points ?? 0}</div>
                        </button>
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

            <aside className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-[#0b2545] mb-3">Details</h3>
              {selected ? (
                <div className="space-y-2 text-sm">
                  <div className="text-gray-700 font-semibold">{selected.fullName || selected.username || selected.email}</div>
                  <div className="text-xs text-gray-500">Email: {selected.email}</div>
                  <div className="text-xs text-gray-500">Role: {selected.role}</div>
                  <div className="text-xs text-gray-500">Status: {selected.status}</div>
                  <div className="text-xs text-gray-500">Institute: {selected.institute?.name || 'Independent'}</div>
                  <div className="text-xs text-gray-500">Volunteer ID: {selected.volunteerId || '—'}</div>
                  <div className="text-xs text-gray-500">Points: {selected.volunteerProfile?.points ?? 0}</div>
                  <div className="text-xs text-gray-500">Official: {selected.volunteerProfile?.isOfficial ? 'Yes' : 'No'}</div>
                  <details className="mt-2 text-xs text-gray-600">
                    <summary className="cursor-pointer">View raw JSON</summary>
                    <pre className="mt-2 overflow-auto text-xs bg-white p-2 rounded border border-gray-100">{JSON.stringify(selected, null, 2)}</pre>
                  </details>
                </div>
              ) : (
                <div className="text-sm text-gray-600">Select a user to view details.</div>
              )}
            </aside>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
