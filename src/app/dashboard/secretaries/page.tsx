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

  // org lists fetched from server
  const [servicesList, setServicesList] = useState<Array<{id:string;name:string}>>([]);
  const [sectorsList, setSectorsList] = useState<Array<{id:string;name:string}>>([]);
  const [clubsList, setClubsList] = useState<Array<{id:string;name:string}>>([]);
  // Tab state: 'create' (default) or 'manage'
  const [tab, setTab] = useState<'create'|'manage'>('create');

  // Manage tasks state
  const [tasks, setTasks] = useState<Array<any>>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPoint, setEditPoint] = useState<number | ''>('');
  const [editPointsToDeduct, setEditPointsToDeduct] = useState<number | ''>('');
  const [editExpire, setEditExpire] = useState('');
  const [editMandatory, setEditMandatory] = useState(false);
  const [editInputType, setEditInputType] = useState<'YESNO'|'COMMENT'|'IMAGE'|'DONATION'>('YESNO');
  const [editTargetAll, setEditTargetAll] = useState(false);
  const [editSelectedServices, setEditSelectedServices] = useState<string[]>([]);
  const [editSelectedSectors, setEditSelectedSectors] = useState<string[]>([]);
  const [editSelectedClubs, setEditSelectedClubs] = useState<string[]>([]);

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskExpire, setTaskExpire] = useState('');
  const [taskPoint, setTaskPoint] = useState<number | ''>('');
  const [taskMandatory, setTaskMandatory] = useState(false);
  const [taskPointsToDeduct, setTaskPointsToDeduct] = useState<number | ''>('');
  const [taskInputType, setTaskInputType] = useState<'YESNO'|'COMMENT'|'IMAGE'>('YESNO');
  const [taskRestriction, setTaskRestriction] = useState<'ALL'|'SERVICE'|'SECTOR'>('ALL');
  const [taskStatus, setTaskStatus] = useState<string | null>(null);

  // Target selections (support multi-select across multiple group types)
  const [targetAll, setTargetAll] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);

  // Since requested frontend-only for Secretaries, forms will preview data locally.


  const submitTask = async () => {
    setTaskStatus(null);
    try {
      const assigned: any = {};
      if (targetAll) assigned.all = true;
      else {
        if (selectedServices.length) assigned.services = selectedServices;
        if (selectedSectors.length) assigned.sectors = selectedSectors;
        if (selectedClubs.length) assigned.clubs = selectedClubs;
      }

      const payload: any = {
        title: taskTitle,
        description: taskDescription,
        expireAt: taskExpire,
        points: Number(taskPoint || 0),
        mandatory: taskMandatory,
        pointsToDeduct: taskMandatory ? Number(taskPointsToDeduct || 0) : undefined,
        inputType: taskInputType,
        assigned,
      };
      const res = await fetch('/api/secretaries/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create task');
      setTaskStatus('Created: ' + (data.task?.id || JSON.stringify(data.task)));
      // refresh manage list if visible
      if (tab === 'manage') fetchTasks();
    } catch (err: any) {
      setTaskStatus('Error: ' + (err?.message || 'Unknown'));
    }
  };

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch('/api/secretaries/tasks');
      if (!res.ok) throw new Error('Failed to load tasks');
      const data = await res.json();
      setTasks(Array.isArray(data.tasks) ? data.tasks : data.tasks || []);
    } catch (e) {
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Format date in Dhaka timezone (UTC+6)
  const formatDhakaDate = (dateStr: string | Date, includeTime = false) => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    };
    return date.toLocaleString('en-US', options);
  };

  // Convert UTC date to Dhaka local datetime-local format for input
  const toDhakaInputFormat = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    // Convert to Dhaka timezone by adding 6 hours offset
    const dhakaDate = new Date(date.getTime() + (6 * 60 * 60 * 1000));
    return dhakaDate.toISOString().slice(0, 16);
  };

  const startEdit = (t: any) => {
    setEditingTaskId(t.id);
    setEditTitle(t.title || '');
    setEditDescription(t.description || '');
    setEditPoint(t.pointsPositive ?? '');
    setEditPointsToDeduct(t.pointsNegative ?? '');
    setEditExpire(t.endDate ? toDhakaInputFormat(t.endDate) : '');
    setEditMandatory(!!t.mandatory);
    setEditInputType(t.taskType || 'YESNO');
    
    // Parse assigned groups
    let assigned: any = {};
    try {
      if (t.assignedGroup) assigned = JSON.parse(t.assignedGroup);
    } catch (e) {
      console.error("Failed to parse assignedGroup", e);
    }

    setEditTargetAll(!!assigned.all);
    setEditSelectedServices(assigned.services || []);
    setEditSelectedSectors(assigned.sectors || []);
    setEditSelectedClubs(assigned.clubs || []);
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditTitle('');
    setEditDescription('');
    setEditPoint('');
    setEditPointsToDeduct('');
    setEditExpire('');
    setEditMandatory(false);
    setEditInputType('YESNO');
    setEditTargetAll(false);
    setEditSelectedServices([]);
    setEditSelectedSectors([]);
    setEditSelectedClubs([]);
  };

  const saveEdit = async (id: string) => {
    try {
      const assigned: any = {};
      let hasAssigned = false;
      if (editTargetAll) {
        assigned.all = true;
        hasAssigned = true;
      } else {
        if (editSelectedServices.length) { assigned.services = editSelectedServices; hasAssigned = true; }
        if (editSelectedSectors.length) { assigned.sectors = editSelectedSectors; hasAssigned = true; }
        if (editSelectedClubs.length) { assigned.clubs = editSelectedClubs; hasAssigned = true; }
      }

      const payload: any = {
        title: editTitle,
        description: editDescription,
        points: editPoint === '' ? 0 : Number(editPoint),
        pointsToDeduct: editPointsToDeduct === '' ? 0 : Number(editPointsToDeduct),
        expireAt: editExpire,
        mandatory: editMandatory,
        inputType: editInputType,
      };
      if (hasAssigned) payload.assigned = assigned;

      const res = await fetch(`/api/secretaries/tasks/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update');
      // refresh manage list
      fetchTasks();
      setEditingTaskId(null);
    } catch (err: any) {
      alert(err?.message || 'Update failed');
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      const res = await fetch(`/api/secretaries/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      alert('Failed to delete task');
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

  useEffect(() => {
    // fetch org lists (services/sectors/clubs)
    (async () => {
      try {
        const res = await fetch('/api/orgs');
        if (!res.ok) return;
        const data = await res.json();
        setServicesList(data.services || []);
        setSectorsList(data.sectors || []);
        setClubsList(data.clubs || []);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // Hooks used for client-side query handling and modal state must be
  // declared before any conditional return to preserve hook order.
  const displayName = viewer?.fullName || viewer?.username || (session as any)?.user?.name || 'Secretaries';
  const displayEmail = viewer?.email || (session as any)?.user?.email || '';
  const displayRole = (session as any)?.user?.role || (viewer?.role as "VOLUNTEER" | "HR" | "MASTER" | "ADMIN" | "DIRECTOR" | "DATABASE_DEPT" | "SECRETARIES") || "HR";
  const [queryTaskId, setQueryTaskId] = useState<string | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const sp = new URLSearchParams(window.location.search || '');
      setQueryTaskId(sp.get('taskId') || null);
      // initialize currentTaskId if present on load
      const initial = sp.get('taskId') || null;
      if (initial) setCurrentTaskId(initial);
    } catch (e) {
      setQueryTaskId(null);
    }
  }, []);

  // Modal state for viewing submissions (approve flow)
  const [submissionsModalOpen, setSubmissionsModalOpen] = useState(false);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);

  // Perform client-side redirect if unauthorized
  useEffect(() => {
    if (!userLoading && displayRole !== 'MASTER' && displayRole !== 'SECRETARIES') {
      router.push('/dashboard');
    }
  }, [userLoading, displayRole, router]);

  // If opened with ?taskId=..., fetch submissions and open modal (client-side)
  useEffect(() => {
    const id = queryTaskId;
    if (!id) return;
    if (userLoading) return;
    if (displayRole !== 'MASTER' && displayRole !== 'SECRETARIES') return;

    (async () => {
      setSubmissionsError(null);
      setSubmissionsLoading(true);
      try {
        const res = await fetch(`/api/tasks/${id}/approve`);
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d?.error || 'Failed to load submissions');
        }
        const d = await res.json();
        setSubmissionsList(d.submissions || []);
        setCurrentTaskId(id);
        setSubmissionsModalOpen(true);
      } catch (e: any) {
        setSubmissionsError(e?.message || 'Failed to load submissions');
      } finally {
        setSubmissionsLoading(false);
      }
    })();
  }, [queryTaskId, userLoading, displayRole]);

  // Approve / Reject handlers
  const handleApprove = async (submissionId: string) => {
    const taskId = currentTaskId || queryTaskId;
    if (!taskId) return;
    try {
      setSubmissionsLoading(true);
      const res = await fetch(`/api/tasks/${taskId}/approve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ submissionId, action: 'APPROVE' }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || 'Approve failed');
      const updated = d.submission;
      setSubmissionsList(prev => prev.map(s => s.id === updated.id ? updated : s));
    } catch (e: any) {
      alert('Approve failed: ' + (e?.message || 'Unknown'));
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleReject = async (submissionId: string) => {
    const taskId = currentTaskId || queryTaskId;
    if (!taskId) return;
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return;
    try {
      setSubmissionsLoading(true);
      const res = await fetch(`/api/tasks/${taskId}/approve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ submissionId, action: 'REJECT', reason }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || 'Reject failed');
      const updated = d.submission;
      setSubmissionsList(prev => prev.map(s => s.id === updated.id ? updated : s));
    } catch (e: any) {
      alert('Reject failed: ' + (e?.message || 'Unknown'));
    } finally {
      setSubmissionsLoading(false);
    }
  };

  if (status === 'unauthenticated') return null;


  // allow only MASTER or SECRETARIES (MASTER should still have access)
  // Avoid calling router.push during render (server) — return null while
  // loading or if unauthorized; perform redirect client-side in useEffect.
  if (!userLoading && displayRole !== 'MASTER' && displayRole !== 'SECRETARIES') {
    return null;
  }

  const inputCls = 'w-full px-3 py-2 rounded-md border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#2b6cb0] focus:border-[#2b6cb0] text-slate-900 placeholder:text-slate-400';

  const renderButtons = (list: any[], selected: string[], toggle: (id: string) => void) => (
    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-3 border border-slate-200 rounded-xl bg-white/50">
      {list.length === 0 && <span className="text-xs text-slate-400">No items available</span>}
      {list.map(item => {
        const isSelected = selected.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => toggle(item.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              isSelected 
                ? 'bg-[#2b6cb0] text-white border-[#2b6cb0] shadow-sm ring-2 ring-blue-100' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {item.name}
          </button>
        );
      })}
    </div>
  );

  // Render structured submission data (donation tidy formatting)
  const renderSubmissionData = (raw: any) => {
    if (!raw) return null;
    let parsed: any = null;
    if (typeof raw === 'string') {
      try { parsed = JSON.parse(raw); } catch (e) { parsed = raw; }
    } else {
      parsed = raw;
    }

    // If parsed is an object with donation-like keys, render nicely
    if (parsed && typeof parsed === 'object' && (parsed.amount || parsed.trxId || parsed.paymentMethod || parsed.donationId)) {
      return (
        <div className="mt-2 bg-slate-50 p-3 rounded-md border border-slate-100 text-sm text-slate-800">
          {parsed.amount !== undefined && (
            <div><strong>Amount:</strong> ৳ {parsed.amount}</div>
          )}
          {parsed.trxId && (
            <div><strong>Transaction ID:</strong> {parsed.trxId}</div>
          )}
          {parsed.paymentMethod && (
            <div><strong>Method:</strong> {parsed.paymentMethod}</div>
          )}
          {parsed.senderNumber && (
            <div><strong>Sender Number:</strong> {parsed.senderNumber}</div>
          )}
          {parsed.donatedAt && (
            <div><strong>Donated At:</strong> {new Date(parsed.donatedAt).toLocaleString()}</div>
          )}
          {parsed.donationId && (
            <div><strong>Donation ID:</strong> {parsed.donationId}</div>
          )}
        </div>
      );
    }

    // Fallback: pretty-print JSON or show raw string
    if (parsed && typeof parsed === 'object') {
      return <pre className="mt-2 p-3 bg-slate-50 rounded-md text-sm text-slate-700 overflow-auto">{JSON.stringify(parsed, null, 2)}</pre>;
    }
    return <div className="mt-2 text-sm text-slate-700">{String(parsed)}</div>;
  };

  const content = (
    <div className="min-h-[calc(100vh-140px)] bg-transparent py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col gap-3 mb-6">
          <p className="text-sm uppercase tracking-[0.2em] text-[#0b1c33]">Secretaries Console</p>
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-[#0b1c33]">Create & Manage Tasks</h1>
          <p className="text-[#0b1c33] text-sm md:text-base">Target services, sectors, or clubs with one action. Everyone selected receives a notification.</p>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <button type="button" onClick={() => setTab('create')} className={`px-4 py-2 rounded-full text-sm font-semibold transition ${tab === 'create' ? 'bg-white text-[#0b1c33] shadow' : 'bg-white/90 text-slate-700 border border-slate-200'}`}>Create Task</button>
          <button type="button" onClick={() => { setTab('manage'); fetchTasks(); }} className={`px-4 py-2 rounded-full text-sm font-semibold transition ${tab === 'manage' ? 'bg-white text-[#0b1c33] shadow' : 'bg-white/90 text-slate-700 border border-slate-200'}`}>Manage Tasks</button>
        </div>

        {tab === 'create' ? (
        <form className="bg-white border border-slate-200 p-6 md:p-8 rounded-2xl shadow-sm space-y-5" onSubmit={(e)=>{ e.preventDefault(); submitTask(); }}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#07223f] mb-1">Task Title</label>
              <input value={taskTitle} onChange={(e)=>setTaskTitle(e.target.value)} placeholder="Task title" className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#07223f] mb-1">Description</label>
              <textarea value={taskDescription} onChange={(e)=>setTaskDescription(e.target.value)} placeholder="What should volunteers do?" className={inputCls} rows={4} />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#07223f] mb-1">Deadline</label>
              <input value={taskExpire} onChange={(e)=>setTaskExpire(e.target.value)} type="datetime-local" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#07223f] mb-1">Points</label>
              <input value={taskPoint as any} onChange={(e)=>setTaskPoint(e.target.value==='' ? '' : Number(e.target.value))} type="number" className={inputCls} />
            </div>
            <div className="flex items-center gap-3 mt-1">
              <input type="checkbox" checked={taskMandatory} onChange={(e)=>setTaskMandatory(e.target.checked)} className="h-4 w-4" />
              <div>
                <p className="text-sm font-medium text-[#07223f]">Mandatory</p>
                <p className="text-xs text-slate-500">If checked, non-compliance may affect scoring.</p>
              </div>
            </div>
            {taskMandatory && (
              <div>
                <label className="block text-sm font-medium text-[#07223f] mb-1">Points To Deduct If Not Completed</label>
                <input value={taskPointsToDeduct as any} onChange={(e)=>setTaskPointsToDeduct(e.target.value==='' ? '' : Number(e.target.value))} type="number" className={inputCls} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-[#07223f] mb-1">Task Type</label>
              <select value={taskInputType} onChange={(e)=>setTaskInputType(e.target.value as any)} className={inputCls}>
                <option value="YESNO">Yes / No</option>
                <option value="COMMENT">Comment</option>
                <option value="IMAGE">Image</option>
                <option value="DONATION">Donation</option>
              </select>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 md:p-5 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-[#07223f]">Target Audience</p>
                <p className="text-xs text-slate-500">Pick one or many groups. Everyone selected gets notified.</p>
              </div>
              <div className="text-xs text-slate-500">{targetAll ? 'All volunteers' : `${selectedServices.length + selectedSectors.length + selectedClubs.length} selected`}</div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                <input type="checkbox" checked={targetAll} onChange={(e)=>{ setTargetAll(e.target.checked); if (e.target.checked) { setSelectedServices([]); setSelectedSectors([]); setSelectedClubs([]); } }} className="h-4 w-4" />
                <span className="text-sm text-[#07223f]">Notify all volunteers</span>
              </label>
            </div>

            {!targetAll && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Services</label>
                    {renderButtons(servicesList, selectedServices, (id) => {
                      setSelectedServices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                    })}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Sectors</label>
                    {renderButtons(sectorsList, selectedSectors, (id) => {
                      setSelectedSectors(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Clubs</label>
                    {renderButtons(clubsList, selectedClubs, (id) => {
                      setSelectedClubs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                    })}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Selected Preview ({selectedServices.length + selectedSectors.length + selectedClubs.length})</label>
                    <div className="flex flex-wrap gap-2 p-3 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 min-h-[60px]">
                      {[...selectedServices, ...selectedSectors, ...selectedClubs].length === 0 ? (
                        <span className="text-xs text-slate-400 self-center mx-auto">Selected items will appear here</span>
                      ) : (
                        [...selectedServices, ...selectedSectors, ...selectedClubs].map(id => {
                          const name = servicesList.find(s=>s.id===id)?.name || sectorsList.find(s=>s.id===id)?.name || clubsList.find(s=>s.id===id)?.name || id;
                          return (
                            <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#2b6cb0]/10 text-[#2b6cb0] text-xs font-medium rounded-md border border-[#2b6cb0]/20">
                              {name}
                              <button type="button" onClick={() => {
                                setSelectedServices(prev => prev.filter(x => x !== id));
                                setSelectedSectors(prev => prev.filter(x => x !== id));
                                setSelectedClubs(prev => prev.filter(x => x !== id));
                              }} className="hover:text-red-500">×</button>
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" className="px-5 py-2.5 bg-[#2b6cb0] hover:bg-[#1f5aa0] text-white rounded-lg shadow transition">Create Task</button>
            {taskStatus && <div className="text-sm text-gray-700">{taskStatus}</div>}
          </div>
        </form>
        ) : (
          <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-2xl shadow-sm space-y-4">
            {loadingTasks ? (
              <div className="text-sm text-slate-600">Loading...</div>
            ) : tasks.length === 0 ? (
              <div className="text-sm text-slate-600">No active tasks.</div>
            ) : (
              <div className="space-y-3">
                {tasks.map((t) => (
                  <div key={t.id} className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {editingTaskId === t.id ? (
                        <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-blue-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2">
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Title</label>
                              <input className={inputCls} value={editTitle} onChange={e=>setEditTitle(e.target.value)} />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
                              <textarea className={inputCls} value={editDescription} onChange={e=>setEditDescription(e.target.value)} rows={3} />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Deadline</label>
                              <input className={inputCls} type="datetime-local" value={editExpire} onChange={e=>setEditExpire(e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Points</label>
                              <input className={inputCls} type="number" value={editPoint as any} onChange={e=>setEditPoint(e.target.value==='' ? '' : Number(e.target.value))} />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Task Type</label>
                              <select value={editInputType} onChange={(e)=>setEditInputType(e.target.value as any)} className={inputCls}>
                                <option value="YESNO">Yes / No</option>
                                <option value="COMMENT">Comment</option>
                                <option value="IMAGE">Image</option>
                                <option value="DONATION">Donation</option>
                              </select>
                            </div>
                            <div className="flex flex-col justify-center">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={editMandatory} onChange={e=>setEditMandatory(e.target.checked)} className="h-4 w-4" />
                                <span className="text-xs font-semibold text-slate-500">Mandatory</span>
                              </label>
                              {editMandatory && (
                                <div className="mt-2">
                                  <label className="block text-[10px] font-semibold text-slate-400">Deduction points</label>
                                  <input className={inputCls} type="number" value={editPointsToDeduct as any} onChange={e=>setEditPointsToDeduct(e.target.value==='' ? '' : Number(e.target.value))} placeholder="Points to deduct" />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="border-t border-slate-200 pt-3">
                            <label className="block text-xs font-semibold text-slate-500 mb-2">Update Audience (Optional - leave unchecked to keep current)</label>
                            <label className="flex items-center gap-2 mb-2">
                              <input type="checkbox" checked={editTargetAll} onChange={e=>{
                                setEditTargetAll(e.target.checked);
                                if (e.target.checked) { setEditSelectedServices([]); setEditSelectedSectors([]); setEditSelectedClubs([]); }
                              }} />
                              <span className="text-xs text-slate-600">All Volunteers</span>
                            </label>
                            {!editTargetAll && (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Services</label>
                                  {renderButtons(servicesList, editSelectedServices, (id) => {
                                    setEditSelectedServices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                                  })}
                                </div>
                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Sectors</label>
                                  {renderButtons(sectorsList, editSelectedSectors, (id) => {
                                    setEditSelectedSectors(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                                  })}
                                </div>
                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Clubs</label>
                                  {renderButtons(clubsList, editSelectedClubs, (id) => {
                                    setEditSelectedClubs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 pt-2">
                            <button onClick={() => saveEdit(t.id)} className="px-4 py-2 bg-[#2b6cb0] text-white rounded-md text-sm font-medium shadow-sm">Save Changes</button>
                            <button onClick={cancelEdit} className="px-4 py-2 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-600">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="font-semibold text-slate-900">{t.title}</div>
                          <div className="text-sm text-slate-600">{t.description}</div>
                          <div className="text-xs text-slate-500 mt-1">Points: {t.pointsPositive ?? 0} • Expires: {t.endDate ? formatDhakaDate(t.endDate, true) : '—'}</div>
                        </>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {editingTaskId !== t.id && (
                        <>
                          <button onClick={() => startEdit(t)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm">Edit</button>
                          <button onClick={() => fetchTasks()} className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm">Refresh</button>
                          <button onClick={() => deleteTask(t.id)} className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">Delete</button>
                          <button onClick={async () => {
                                try {
                                  setSubmissionsError(null);
                                  setSubmissionsLoading(true);
                                  const res = await fetch(`/api/tasks/${t.id}/approve`);
                                  if (!res.ok) { const d = await res.json().catch(()=>({})); throw new Error(d?.error || 'Failed'); }
                                  const d = await res.json();
                                  setSubmissionsList(d.submissions || []);
                                  setSubmissionsModalOpen(true);
                                  // set current queryTaskId-like variable so approve uses it
                                  // We reuse queryTaskId variable for modal API calls by setting location (client only)
                                  try { window.history.replaceState({}, '', '/dashboard/secretaries?taskId=' + t.id); } catch(e) {}
                                  setCurrentTaskId(t.id);
                                } catch (e:any) { alert('Failed to open submissions: ' + (e?.message || 'Unknown')); }
                                finally { setSubmissionsLoading(false); }
                            }} className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm">View Submissions</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <DashboardLayout userRole={displayRole} userName={displayName} userEmail={displayEmail} userId={viewer?.id || ""}>
      {content}

      {submissionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSubmissionsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-3xl rounded-xl shadow-lg p-6 overflow-auto max-h-[80vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Submissions for Task</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setSubmissionsModalOpen(false)} className="px-3 py-1 bg-white border border-slate-200 rounded-md">Close</button>
              </div>
            </div>

            {submissionsLoading ? (
              <div className="text-sm text-slate-600">Loading submissions...</div>
            ) : submissionsError ? (
              <div className="text-sm text-red-600">{submissionsError}</div>
            ) : submissionsList.length === 0 ? (
              <div className="text-sm text-slate-600">No submissions yet.</div>
            ) : (
              <div className="space-y-3">
                {submissionsList.map((s) => (
                  <div key={s.id} className="border border-slate-100 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{s.user?.fullName || s.user?.email || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{s.user?.email || ''} • Volunteer ID: {s.user?.volunteerId || '—'}</div>
                      </div>
                      <div className="text-sm font-semibold">
                        {s.status}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 mt-2">Submitted: {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '—'}</div>
                    {s.submissionData ? (
                      <div>{renderSubmissionData(s.submissionData)}</div>
                    ) : null}
                    {s.submissionFiles && s.submissionFiles.length ? (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {s.submissionFiles.map((f: string, idx: number) => (
                          <a key={idx} href={f} target="_blank" rel="noreferrer" className="inline-block border border-slate-200 rounded-md overflow-hidden">
                            <img src={f} alt={`file-${idx}`} className="w-28 h-20 object-cover" />
                          </a>
                        ))}
                      </div>
                    ) : null}

                    {s.status === 'PENDING' && (
                      <div className="mt-3 flex items-center gap-2">
                        <button onClick={() => handleApprove(s.id)} disabled={submissionsLoading} className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm">Approve</button>
                        <button onClick={() => handleReject(s.id)} disabled={submissionsLoading} className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
