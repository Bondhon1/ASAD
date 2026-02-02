"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";
import React from "react";
import { useModal } from '@/components/ui/ModalProvider';

function PreviewIds({ idsCsv }: { idsCsv: string }) {
  const parsed = idsCsv.split(/[,\n\r]+/).map((s: string) => s.trim()).filter(Boolean);
  return (
    <div>
      <div className="font-medium">Parsed IDs: <span className="text-sm text-slate-600">{parsed.length}</span></div>
      <div className="mt-2 text-xs text-slate-500">Sample:</div>
      <div className="mt-1 text-sm text-slate-700">{parsed.slice(0, 10).join(', ')}{parsed.length > 10 ? '...' : ''}</div>
    </div>
  );
}

export default function ManualPointsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email || (typeof window !== "undefined" ? localStorage.getItem("userEmail") : null);
  const { user: viewer, loading: userLoading } = useCachedUserProfile<any>(userEmail);

  const [taskName, setTaskName] = useState("");
  const [points, setPoints] = useState<number | "">(0);
  const [idsCsv, setIdsCsv] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') router.push('/auth');
  }, [status, router]);

  if (status === 'unauthenticated' || !viewer) return null;

  const displayName = viewer?.fullName || viewer?.username || (session as any)?.user?.name || 'Database Dept';
  const displayEmail = viewer?.email || (session as any)?.user?.email || '';
  const displayRole = (viewer?.role as any) || "DATABASE_DEPT";

  const { confirm } = useModal();

  const submit = async () => {
    setStatusMsg(null);
    const parsed = idsCsv.split(/[,\n\r]+/).map((s: string) => s.trim()).filter(Boolean);
    if (parsed.length === 0) return setStatusMsg('No IDs provided');
    if (points === '' || Number.isNaN(Number(points))) return setStatusMsg('Please provide a valid points number');

    // ask for confirmation with summary
    const sample = parsed.slice(0, 8).join(', ');
    const ok = await confirm(`Apply ${points} points to ${parsed.length} users?\nSample: ${sample}${parsed.length > 8 ? ', ...' : ''}\n\nContinue?`, 'Confirm Apply Points', 'warning');
    if (!ok) return;

    setSubmitting(true);
    try {
      const payload = { taskName: taskName || 'Manual upgrade', points: Number(points || 0), idsCsv };
      const res = await fetch('/api/database/manual-points', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      setStatusMsg('Completed: ' + (data.summary || 'OK'));
      // show detailed result snippet
      if (Array.isArray(data.results)) {
        const okCount = data.results.filter((r: any) => r.ok).length;
        setStatusMsg(`Completed: ${okCount}/${data.results.length} succeeded`);
      }
    } catch (e: any) {
      setStatusMsg('Error: ' + (e?.message || 'Unknown'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout userRole={displayRole} userName={displayName} userEmail={displayEmail} userId={viewer?.id || ""}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Manual Point Upgrade</h1>
          <p className="text-sm text-slate-500">Accessible to MASTER and DATABASE_DEPT. Enter volunteer IDs (CSV) to increment points.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium">Task name</label>
              <input value={taskName} onChange={(e) => setTaskName(e.target.value)} className="w-full mt-1 p-2 border rounded-md" placeholder="e.g. Database: manual grant" />
            </div>

            <div>
              <label className="text-sm font-medium">Points to add (use negative for deduction)</label>
              <input type="number" value={points as any} onChange={(e) => setPoints(e.target.value === '' ? '' : Number(e.target.value))} className="w-full mt-1 p-2 border rounded-md" />
            </div>

            <div>
              <label className="text-sm font-medium">ID numbers (CSV) — volunteerId or user id</label>
              <textarea value={idsCsv} onChange={(e) => setIdsCsv(e.target.value)} rows={6} className="w-full mt-1 p-2 border rounded-md" placeholder="12345,67890 or uuid-1,uuid-2 or newline-separated" />

              {/* Preview parsed IDs */}
              {idsCsv.trim().length > 0 && (
                <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-md text-sm text-slate-700">
                  <PreviewIds idsCsv={idsCsv} />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button onClick={submit} disabled={submitting} className="px-4 py-2 bg-[#07223f] text-white rounded-md disabled:opacity-60">{submitting ? 'Submitting...' : 'Submit'}</button>
              <button type="button" onClick={() => { setTaskName(''); setPoints(0); setIdsCsv(''); setStatusMsg(null); }} className="px-3 py-2 border rounded-md">Reset</button>
              {statusMsg && <div className="text-sm text-slate-700">{statusMsg}</div>}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
