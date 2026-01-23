"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";

export default function SecretariesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email || (typeof window !== "undefined" ? localStorage.getItem("userEmail") : null);
  const { user: viewer, loading: userLoading, error: userError, refresh } = useCachedUserProfile<any>(userEmail);

  const [tab, setTab] = useState<'donation'|'task'>('donation');

  // Donation form state
  const [donationTitle, setDonationTitle] = useState('');
  const [donationPurpose, setDonationPurpose] = useState('');
  const [donationNumber, setDonationNumber] = useState('');
  const [donationAmount, setDonationAmount] = useState<number | ''>('');
  const [donationExpire, setDonationExpire] = useState('');
  const [donationPoints, setDonationPoints] = useState<number | ''>('');
  const [donationRestriction, setDonationRestriction] = useState<'ALL'|'SERVICE'|'SECTOR'>('ALL');
  const [donationPlatform, setDonationPlatform] = useState('');
  const [donationStatus, setDonationStatus] = useState<string | null>(null);

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskExpire, setTaskExpire] = useState('');
  const [taskPoint, setTaskPoint] = useState<number | ''>('');
  const [taskMandatory, setTaskMandatory] = useState(false);
  const [taskInputType, setTaskInputType] = useState<'YESNO'|'COMMENT'|'IMAGE'>('YESNO');
  const [taskRestriction, setTaskRestriction] = useState<'ALL'|'SERVICE'|'SECTOR'>('ALL');
  const [taskPlatform, setTaskPlatform] = useState('');
  const [taskStatus, setTaskStatus] = useState<string | null>(null);

  // Since requested frontend-only for Secretaries, forms will preview data locally.

  const submitDonation = async () => {
    setDonationStatus(null);
    try {
      const payload: any = {
        title: donationTitle,
        purpose: donationPurpose,
        amount: donationAmount === '' ? undefined : Number(donationAmount),
        expireAt: donationExpire,
        points: donationPoints === '' ? 0 : Number(donationPoints),
        isPublic: false,
      };
      const res = await fetch('/api/secretaries/donationCampaigns', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create campaign');
      setDonationStatus('Created: ' + (data.campaign?.id || JSON.stringify(data.campaign)));
    } catch (err: any) {
      setDonationStatus('Error: ' + (err?.message || 'Unknown'));
    }
  };

  const submitTask = async () => {
    setTaskStatus(null);
    try {
      const payload: any = {
        title: taskTitle,
        description: taskDescription,
        expireAt: taskExpire,
        points: Number(taskPoint || 0),
        mandatory: taskMandatory,
        inputType: taskInputType,
        restriction: taskRestriction,
      };
      const res = await fetch('/api/secretaries/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create task');
      setTaskStatus('Created: ' + (data.task?.id || JSON.stringify(data.task)));
    } catch (err: any) {
      setTaskStatus('Error: ' + (err?.message || 'Unknown'));
    }
  };
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

  const displayName = viewer?.fullName || viewer?.username || (session as any)?.user?.name || 'Secretaries';
  const displayEmail = viewer?.email || (session as any)?.user?.email || '';
  const displayRole = (session as any)?.user?.role || (viewer?.role as "VOLUNTEER" | "HR" | "MASTER" | "ADMIN" | "DATABASE_DEPT" | "SECRETARIES") || "HR";

  // allow only MASTER or SECRETARIES (MASTER should still have access)
  if (displayRole !== 'MASTER' && displayRole !== 'SECRETARIES') {
    // redirect to dashboard for unauthorized
    router.push('/dashboard');
    return null;
  }

  const content = (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-4">Secretaries — Post Donations & Tasks (Preview)</h1>

      <div className="mb-4">
        <button onClick={() => setTab('donation')} className={`px-3 py-1 rounded ${tab==='donation' ? 'bg-[#1E90FF] text-white' : 'bg-gray-100'}`}>Donation Post</button>
        <button onClick={() => setTab('task')} className={`ml-2 px-3 py-1 rounded ${tab==='task' ? 'bg-[#1E90FF] text-white' : 'bg-gray-100'}`}>Task Post</button>
      </div>

      {tab === 'donation' ? (
        <div className="bg-white border p-4 rounded">
          <div className="grid grid-cols-1 gap-2">
            <input value={donationTitle} onChange={(e)=>setDonationTitle(e.target.value)} placeholder="Donation title" className="px-2 py-1 border rounded" />
            <input value={donationPurpose} onChange={(e)=>setDonationPurpose(e.target.value)} placeholder="Description (optional)" className="px-2 py-1 border rounded" />
            <input value={donationNumber} onChange={(e)=>setDonationNumber(e.target.value)} placeholder="Donation Number" className="px-2 py-1 border rounded" />
            <input value={donationAmount as any} onChange={(e)=>setDonationAmount(e.target.value==='' ? '' : Number(e.target.value))} placeholder="Donation amount" type="number" className="px-2 py-1 border rounded" />
            <input value={donationExpire} onChange={(e)=>setDonationExpire(e.target.value)} placeholder="Expire date and time" type="datetime-local" className="px-2 py-1 border rounded" />
            <input value={donationPoints as any} onChange={(e)=>setDonationPoints(e.target.value==='' ? '' : Number(e.target.value))} placeholder="Point" type="number" className="px-2 py-1 border rounded" />
            <select value={donationRestriction} onChange={(e)=>setDonationRestriction(e.target.value as any)} className="px-2 py-1 border rounded">
              <option value="ALL">All</option>
              <option value="SERVICE">Service</option>
              <option value="SECTOR">Sector</option>
            </select>
            <input value={donationPlatform} onChange={(e)=>setDonationPlatform(e.target.value)} placeholder="Posted platform name" className="px-2 py-1 border rounded" />
          </div>
          <div className="mt-3">
            <button onClick={submitDonation} className="px-3 py-1 bg-[#1E90FF] text-white rounded">Preview</button>
            {donationStatus && <pre className="mt-3 text-xs bg-gray-50 p-3 rounded">{donationStatus}</pre>}
          </div>
        </div>
      ) : (
        <div className="bg-white border p-4 rounded">
          <div className="grid grid-cols-1 gap-2">
            <input value={taskTitle} onChange={(e)=>setTaskTitle(e.target.value)} placeholder="Task title" className="px-2 py-1 border rounded" />
            <textarea value={taskDescription} onChange={(e)=>setTaskDescription(e.target.value)} placeholder="Task description" className="px-2 py-1 border rounded" />
            <input value={taskExpire} onChange={(e)=>setTaskExpire(e.target.value)} placeholder="Expire date and time" type="datetime-local" className="px-2 py-1 border rounded" />
            <input value={taskPoint as any} onChange={(e)=>setTaskPoint(e.target.value==='' ? '' : Number(e.target.value))} placeholder="Task point" type="number" className="px-2 py-1 border rounded" />

            <label className="text-sm">Optional or Mandatory</label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={taskMandatory} onChange={(e)=>setTaskMandatory(e.target.checked)} /> Mandatory (point plus & minus)</label>
            </div>

            <label className="text-sm">Input type</label>
            <select value={taskInputType} onChange={(e)=>setTaskInputType(e.target.value as any)} className="px-2 py-1 border rounded">
              <option value="YESNO">Yes/No</option>
              <option value="COMMENT">Text comment</option>
              <option value="IMAGE">Image</option>
            </select>

            <select value={taskRestriction} onChange={(e)=>setTaskRestriction(e.target.value as any)} className="px-2 py-1 border rounded">
              <option value="ALL">All</option>
              <option value="SERVICE">Service</option>
              <option value="SECTOR">Sector</option>
            </select>

            <input value={taskPlatform} onChange={(e)=>setTaskPlatform(e.target.value)} placeholder="Posted platform name" className="px-2 py-1 border rounded" />
          </div>

          <div className="mt-3">
            <button onClick={submitTask} className="px-3 py-1 bg-[#1E90FF] text-white rounded">Preview</button>
            {taskStatus && <pre className="mt-3 text-xs bg-gray-50 p-3 rounded">{taskStatus}</pre>}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout userRole={displayRole} userName={displayName} userEmail={displayEmail} userId={viewer?.id || ""}>
      {content}
    </DashboardLayout>
  );
}
