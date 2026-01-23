"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";

export default function DatabaseDeptPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email || (typeof window !== "undefined" ? localStorage.getItem("userEmail") : null);
  const { user: viewer, loading: userLoading, error: userError, refresh } = useCachedUserProfile<any>(userEmail);

  const [identifier, setIdentifier] = useState(""); // email or id
  const [points, setPoints] = useState<number | "">("");
  const [rank, setRank] = useState("");
  const [ranks, setRanks] = useState<Array<{ name: string; thresholdPoints: number }> | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [rankName, setRankName] = useState("");
  const [threshold, setThreshold] = useState<number | "">("");
  const [rankStatus, setRankStatus] = useState<string | null>(null);

  const updatePoints = async () => {
    if (!identifier) return setStatusMsg("Provide user id or email");
    setStatusMsg("Saving...");
    try {
      // try to resolve by email first
      // assume identifier is user id when length > 20 (cuid)
      const userId = identifier.length > 20 ? identifier : undefined;
      const resTarget = userId ? `/api/hr/users/${userId}` : `/api/hr/users?email=${encodeURIComponent(identifier)}`;

      // If email provided, attempt to look up user id via profile endpoint
      let idToUse = userId;
      if (!idToUse) {
        const r = await fetch(`/api/user/profile?email=${encodeURIComponent(identifier)}`);
        const d = await r.json();
        idToUse = d?.user?.id;
      }

      if (!idToUse) return setStatusMsg("User not found");

      const body: any = {};
      if (points !== "") body.points = Number(points);
      if (rank) body.rank = rank;

      const r = await fetch(`/api/hr/users/${idToUse}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Failed');
      setStatusMsg('Updated successfully');
    } catch (e: any) {
      setStatusMsg(e?.message || 'Error');
    }
  };

  const updateRankThreshold = async () => {
    if (!rankName) return setRankStatus('Provide rank name');
    setRankStatus('Saving...');
    try {
      const r = await fetch('/api/hr/ranks', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: rankName, thresholdPoints: Number(threshold) }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Failed');
      setRankStatus('Rank updated');
    } catch (e: any) {
      setRankStatus(e?.message || 'Error');
    }
  };

  // load ranks for dropdown
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/hr/ranks');
        const data = await res.json();
        if (res.ok && data?.ranks) setRanks(data.ranks);
      } catch (e) {
        // ignore
      }
    })();
  }, []);
  // auth checks and viewer setup for DashboardLayout
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') router.push('/auth');
  }, [status, router]);

  useEffect(() => {
    if (userLoading) return;
    if (!viewer && !userLoading && !userError) refresh();
  }, [viewer, userLoading, userError, refresh]);

  if (status === 'unauthenticated') return null;

  const displayName = viewer?.fullName || viewer?.username || (session as any)?.user?.name || 'Database Dept';
  const displayEmail = viewer?.email || (session as any)?.user?.email || '';
  const displayRole = (session as any)?.user?.role || (viewer?.role as "VOLUNTEER" | "HR" | "MASTER" | "ADMIN" | "DIRECTOR" | "DATABASE_DEPT" | "SECRETARIES") || "HR";

  const content = (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-4">Database Dept — Points & Rank Management</h1>

      <div className="bg-white border p-4 rounded mb-6">
        <div className="text-sm text-gray-600 mb-2">Edit user points / rank</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="User id or email" className="px-2 py-1 border rounded col-span-1" />
          <input value={points as any} onChange={(e) => setPoints(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Points (leave blank to skip)" className="px-2 py-1 border rounded" />
          {ranks ? (
            <select value={rank} onChange={(e) => setRank(e.target.value)} className="px-2 py-1 border rounded">
              <option value="">-- Select rank (leave blank to skip) --</option>
              {ranks.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
            </select>
          ) : (
            <input value={rank} onChange={(e) => setRank(e.target.value)} placeholder="Rank name (leave blank to skip)" className="px-2 py-1 border rounded" />
          )}
        </div>
        <div className="mt-3">
          <button onClick={updatePoints} className="px-3 py-1 bg-[#1E90FF] text-white rounded">Save</button>
          {statusMsg && <span className="ml-3 text-sm text-gray-600">{statusMsg}</span>}
        </div>
      </div>

      <div className="bg-white border p-4 rounded">
        <div className="text-sm text-gray-600 mb-2">Edit rank threshold</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {ranks ? (
            <select value={rankName} onChange={(e) => setRankName(e.target.value)} className="px-2 py-1 border rounded">
              <option value="">-- Select rank --</option>
              {ranks.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
            </select>
          ) : (
            <input value={rankName} onChange={(e) => setRankName(e.target.value)} placeholder="Rank name" className="px-2 py-1 border rounded" />
          )}
          <input value={threshold as any} onChange={(e) => setThreshold(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Threshold points" className="px-2 py-1 border rounded" />
        </div>
        <div className="mt-3">
          <button onClick={updateRankThreshold} className="px-3 py-1 bg-[#1E90FF] text-white rounded">Update Rank</button>
          {rankStatus && <span className="ml-3 text-sm text-gray-600">{rankStatus}</span>}
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout userRole={displayRole} userName={displayName} userEmail={displayEmail} userId={viewer?.id || ""}>
      {content}
    </DashboardLayout>
  );
}
