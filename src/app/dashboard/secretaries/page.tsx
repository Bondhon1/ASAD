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

  const startEdit = (t: any) => {
    setEditingTaskId(t.id);
    setEditTitle(t.title || '');
    setEditDescription(t.description || '');
    setEditPoint(t.points ?? '');
    setEditPointsToDeduct(t.pointsToDeduct ?? t.pointsNegative ?? '');
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditTitle('');
    setEditDescription('');
    setEditPoint('');
  };

  const saveEdit = async (id: string) => {
    try {
      const payload: any = { title: editTitle, description: editDescription, pointsPositive: editPoint === '' ? 0 : Number(editPoint), pointsToDeduct: editPointsToDeduct === '' ? 0 : Number(editPointsToDeduct) };
      const res = await fetch(`/api/secretaries/tasks/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update');
      // update local
      setTasks(prev => prev.map(p => p.id === id ? { ...p, ...payload } : p));
      cancelEdit();
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

  if (status === 'unauthenticated') return null;

  const displayName = viewer?.fullName || viewer?.username || (session as any)?.user?.name || 'Secretaries';
  const displayEmail = viewer?.email || (session as any)?.user?.email || '';
  const displayRole = (session as any)?.user?.role || (viewer?.role as "VOLUNTEER" | "HR" | "MASTER" | "ADMIN" | "DIRECTOR" | "DATABASE_DEPT" | "SECRETARIES") || "HR";

  // allow only MASTER or SECRETARIES (MASTER should still have access)
  if (displayRole !== 'MASTER' && displayRole !== 'SECRETARIES') {
    // redirect to dashboard for unauthorized
    router.push('/dashboard');
    return null;
  }

  const inputCls = 'w-full px-3 py-2 rounded-md border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#2b6cb0] focus:border-[#2b6cb0] text-slate-900 placeholder:text-slate-400';

  const content = (
    <div className="min-h-[calc(100vh-140px)] bg-transparent py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col gap-3 mb-6">
          <p className="text-sm uppercase tracking-[0.2em] text-[#0b1c33]">Secretaries Console</p>
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-[#0b1c33]">Create Tasks</h1>
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
                    <label className="block text-xs font-medium text-gray-600 mb-1">Services</label>
                    <select multiple value={selectedServices} onChange={(e)=>{
                      const vals = Array.from(e.target.selectedOptions).map(o => o.value);
                      setSelectedServices(vals);
                    }} className={`${inputCls} hidden md:block h-28`}>
                      {servicesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <div className="md:hidden space-y-2 bg-white rounded-lg p-3 border border-slate-200">
                      {servicesList.map(s => (
                        <label key={s.id} className="flex items-center gap-2">
                          <input type="checkbox" checked={selectedServices.includes(s.id)} onChange={(e)=>{
                            setSelectedServices(prev => e.target.checked ? Array.from(new Set([...prev, s.id])) : prev.filter(x => x !== s.id));
                          }} />
                          <span className="text-sm">{s.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Sectors</label>
                    <select multiple value={selectedSectors} onChange={(e)=>{
                      const vals = Array.from(e.target.selectedOptions).map(o => o.value);
                      setSelectedSectors(vals);
                    }} className={`${inputCls} hidden md:block h-28`}>
                      {sectorsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <div className="md:hidden space-y-2 bg-white rounded-lg p-3 border border-slate-200">
                      {sectorsList.map(s => (
                        <label key={s.id} className="flex items-center gap-2">
                          <input type="checkbox" checked={selectedSectors.includes(s.id)} onChange={(e)=>{
                            setSelectedSectors(prev => e.target.checked ? Array.from(new Set([...prev, s.id])) : prev.filter(x => x !== s.id));
                          }} />
                          <span className="text-sm">{s.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Clubs</label>
                    <select multiple value={selectedClubs} onChange={(e)=>{
                      const vals = Array.from(e.target.selectedOptions).map(o => o.value);
                      setSelectedClubs(vals);
                    }} className={`${inputCls} hidden md:block h-28`}>
                      {clubsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <div className="md:hidden space-y-2 bg-white rounded-lg p-3 border border-slate-200">
                      {clubsList.map(s => (
                        <label key={s.id} className="flex items-center gap-2">
                          <input type="checkbox" checked={selectedClubs.includes(s.id)} onChange={(e)=>{
                            setSelectedClubs(prev => e.target.checked ? Array.from(new Set([...prev, s.id])) : prev.filter(x => x !== s.id));
                          }} />
                          <span className="text-sm">{s.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Selected Preview</label>
                    <div className="flex flex-wrap gap-2">
                      {[...selectedServices, ...selectedSectors, ...selectedClubs].slice(0, 18).map(id => {
                        const name = servicesList.find(s=>s.id===id)?.name || sectorsList.find(s=>s.id===id)?.name || clubsList.find(s=>s.id===id)?.name || id;
                        return <span key={id} className="px-2 py-1 bg-white text-sm rounded-full border border-slate-200 text-[#07223f] shadow-sm">{name}</span>;
                      })}
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
                        <div className="space-y-2">
                          <input className={inputCls} value={editTitle} onChange={e=>setEditTitle(e.target.value)} />
                          <textarea className={inputCls} value={editDescription} onChange={e=>setEditDescription(e.target.value)} rows={3} />
                          <div className="flex gap-2">
                            <input className={inputCls} type="number" value={editPoint as any} onChange={e=>setEditPoint(e.target.value==='' ? '' : Number(e.target.value))} />
                            <input className={inputCls} type="number" value={editPointsToDeduct as any} onChange={e=>setEditPointsToDeduct(e.target.value==='' ? '' : Number(e.target.value))} placeholder="Points to deduct" />
                            <button onClick={() => saveEdit(t.id)} className="px-3 py-1.5 bg-[#2b6cb0] text-white rounded-md">Save</button>
                            <button onClick={cancelEdit} className="px-3 py-1.5 bg-white border border-slate-200 rounded-md">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="font-semibold text-slate-900">{t.title}</div>
                          <div className="text-sm text-slate-600">{t.description}</div>
                          <div className="text-xs text-slate-500 mt-1">Points: {t.points ?? 0} • Expires: {t.expireAt ?? '—'}</div>
                        </>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {editingTaskId !== t.id && (
                        <>
                          <button onClick={() => startEdit(t)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm">Edit</button>
                          <button onClick={() => deleteTask(t.id)} className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">Delete</button>
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
    </DashboardLayout>
  );
}
