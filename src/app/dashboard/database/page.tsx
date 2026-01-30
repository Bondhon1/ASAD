"use client";

import { useEffect, useState, useRef } from "react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";

export default function DatabaseDeptPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email || (typeof window !== "undefined" ? localStorage.getItem("userEmail") : null);
  const { user: viewer, loading: userLoading, error: userError, refresh: refreshViewer } = useCachedUserProfile<any>(userEmail);

  // User points/rank management
  const [userQuery, setUserQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [points, setPoints] = useState<number | "">("");
  const [rank, setRank] = useState("");
  const [ranks, setRanks] = useState<Array<{ id: string; name: string; thresholdPoints: number; description: string | null; parentId: string | null; parent?: { name: string } }> | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Rank management
  const [editingRank, setEditingRank] = useState<string | null>(null); // rank name
  const [newRankName, setNewRankName] = useState("");
  const [newThreshold, setNewThreshold] = useState<number | "">("");
  const [newDescription, setNewDescription] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [rankMsg, setRankMsg] = useState<string | null>(null);

  // Search users
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (userQuery.length > 2) {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/hr/users?q=${encodeURIComponent(userQuery)}&pageSize=5`);
          const data = await res.json();
          setSearchResults(data.users || []);
          setShowResults(true);
        } catch (e) {
          // ignore
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [userQuery]);

  // Handle click outside search results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchRef]);

  const loadRanks = async () => {
    try {
      const res = await fetch('/api/hr/ranks');
      const data = await res.json();
      if (res.ok && data?.ranks) setRanks(data.ranks);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadRanks();
  }, []);

  const updatePoints = async () => {
    if (!selectedUser) return setStatusMsg("Please select a user first");
    setStatusMsg("Saving...");
    try {
      const body: any = {};
      if (points !== "") body.points = Number(points);
      if (rank) body.rank = rank;

      const r = await fetch(`/api/hr/users/${selectedUser.id}`, { 
        method: 'PATCH', 
        headers: { 'content-type': 'application/json' }, 
        body: JSON.stringify(body) 
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Failed');
      setStatusMsg('Updated successfully');
      // Update local state if needed
    } catch (e: any) {
      setStatusMsg(e?.message || 'Error');
    }
  };

  const saveRank = async () => {
    if (!editingRank) return setRankMsg('Select a rank to update');
    setRankMsg('Saving...');
    try {
      // Only update threshold and description for an existing rank.
      const r = await fetch('/api/hr/ranks', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: editingRank,
          thresholdPoints: Number(newThreshold || 0),
          description: newDescription,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Failed');
      setRankMsg('Rank updated successfully');
      // keep editing open so user can tweak; update local inputs
      setNewRankName(d.rank?.name || editingRank || "");
      setNewThreshold(d.rank?.thresholdPoints ?? "");
      setNewDescription(d.rank?.description || "");
      await loadRanks();
    } catch (e: any) {
      setRankMsg(e?.message || 'Error');
    }
  };

  const startEditingRank = (r: any) => {
    setEditingRank(r.name);
    setNewRankName(r.name);
    setNewThreshold(r.thresholdPoints);
    setNewDescription(r.description || "");
    setNewParentId(r.parentId || "");
    setRankMsg(null);
  };

  // auth checks
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') router.push('/auth');
  }, [status, router]);

  if (status === 'unauthenticated' || !viewer) return null;

  const displayName = viewer?.fullName || viewer?.username || (session as any)?.user?.name || 'Database Dept';
  const displayEmail = viewer?.email || (session as any)?.user?.email || '';
  const displayRole = (viewer?.role as any) || "DATABASE_DEPT";

  return (
    <DashboardLayout userRole={displayRole} userName={displayName} userEmail={displayEmail} userId={viewer?.id || ""}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-800">Database Administration</h1>
          <p className="text-slate-500">Manage user points, ranks, and thresholds.</p>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:gap-4">
            <Link href="/dashboard/database/manual-points" className="inline-flex items-center gap-3 px-4 py-2 bg-[#07223f] text-white rounded-lg shadow-sm hover:opacity-95">
              Manual Point Upgrade
            </Link>
            <p className="text-sm text-slate-500 mt-3 sm:mt-0">Quickly add or deduct points for multiple volunteers via CSV of IDs.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Points & Rank Management */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </span>
              User Management
            </h2>

            <div className="space-y-4">
              <div className="relative" ref={searchRef}>
                <label className="block text-sm font-medium text-slate-700 mb-1">Find User</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={selectedUser ? `${selectedUser.fullName || selectedUser.username} (${selectedUser.email})` : userQuery}
                    onChange={(e) => {
                      if (selectedUser) {
                        setSelectedUser(null);
                        setUserQuery("");
                      } else {
                        setUserQuery(e.target.value);
                      }
                    }}
                    placeholder="Search by name, email or ID..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                  />
                  <div className="absolute left-3 top-2.5 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  </div>
                  {isSearching && (
                    <div className="absolute right-3 top-2.5">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>

                {showResults && searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedUser(u);
                          setPoints(u.volunteerProfile?.points || 0);
                          setRank(u.volunteerProfile?.rank?.name || u.volunteerProfile?.rank || "");
                          setShowResults(false);
                          setUserQuery("");
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-0 border-slate-100 transition-colors"
                      >
                        <div className="font-medium text-slate-800">{u.fullName || u.username}</div>
                        <div className="text-xs text-slate-500">{u.email} • ID: {u.id.slice(-8)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedUser && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-blue-900">{selectedUser.fullName || selectedUser.username}</h3>
                      <p className="text-xs text-blue-700">{selectedUser.email}</p>
                    </div>
                    <button onClick={() => setSelectedUser(null)} className="text-blue-400 hover:text-blue-600">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-blue-800 mb-1">Points</label>
                      <input 
                        type="number"
                        value={points}
                        onChange={(e) => setPoints(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-800 mb-1">Rank</label>
                      {ranks ? (
                        <select 
                          value={rank} 
                          onChange={(e) => setRank(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- No Rank --</option>
                          {ranks.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                        </select>
                      ) : (
                        <input 
                          type="text"
                          value={rank}
                          onChange={(e) => setRank(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <button 
                      onClick={updatePoints}
                      className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      Update Profile
                    </button>
                    {statusMsg && <span className="text-sm font-medium text-blue-700">{statusMsg}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rank Thresholds/Creation */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
              </span>
              Rank Config
            </h2>

            <div className="space-y-4 flex-1">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">{editingRank ? `Editing: ${editingRank}` : 'Select a rank to update'}</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Rank Name</label>
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700">{editingRank || '—'}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Threshold Points</label>
                    <input 
                      type="number"
                      value={newThreshold} 
                      onChange={(e) => setNewThreshold(e.target.value === "" ? "" : Number(e.target.value))} 
                      placeholder="e.g. 100" 
                      disabled={!editingRank}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                    <input 
                      value={newDescription} 
                      onChange={(e) => setNewDescription(e.target.value)} 
                      placeholder="e.g. Need 100 points, Award Badge" 
                      disabled={!editingRank}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={saveRank} disabled={!editingRank} className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                    Update Rank
                  </button>
                  {editingRank && (
                    <button onClick={() => { setEditingRank(null); setNewRankName(""); setNewThreshold(""); setNewDescription(""); setNewParentId(""); }} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50">
                      Cancel
                    </button>
                  )}
                  {rankMsg && <span className="text-sm font-medium text-amber-700">{rankMsg}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ranks Table */}
        <div className="mt-10 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Current Rank Hierarchy</h2>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">Total: {ranks?.length || 0}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 font-semibold">Rank Name</th>
                  <th className="px-6 py-3 font-semibold">Parent</th>
                  <th className="px-6 py-3 font-semibold text-center">Threshold</th>
                  <th className="px-6 py-3 font-semibold">Description</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ranks?.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800 flex items-center gap-2">
                        {r.parentId && <span className="text-slate-300">↳</span>}
                        {r.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {r.parent ? (
                        <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md font-medium">{r.parent.name}</span>
                      ) : (
                        <span className="text-slate-300 text-xs italic">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-10 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                        {r.thresholdPoints}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 truncate max-w-[200px]">
                      {r.description || <span className="text-slate-300 italic">No description</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => startEditingRank(r)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {!ranks?.length && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">
                      No ranks configured in the database yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
