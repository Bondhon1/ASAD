"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useCachedUserProfile } from '@/hooks/useCachedUserProfile';
import { useSession } from 'next-auth/react';

export default function TasksPage() {
  const { data: session } = useSession();
  const userEmail = session?.user?.email || (typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null);
  const { user } = useCachedUserProfile<any>(userEmail);
  const [tasks, setTasks] = useState<any[]>([]);
  const [createdTasks, setCreatedTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createdLoading, setCreatedLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSource, setEditSource] = useState<'assigned' | 'created' | 'admin' | null>(null);
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

  const [servicesList, setServicesList] = useState<any[]>([]);
  const [sectorsList, setSectorsList] = useState<any[]>([]);
  const [clubsList, setClubsList] = useState<any[]>([]);

  const role = ((user as any)?.role || (session as any)?.user?.role || '');
  const canCreate = ['SECRETARIES', 'MASTER'].includes(role);
  const isSuperAdmin = ['MASTER', 'ADMIN'].includes(role);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/orgs');
        if (res.ok) {
          const d = await res.json();
          setServicesList(d.services || []);
          setSectorsList(d.sectors || []);
          setClubsList(d.clubs || []);
        }
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/tasks');
        if (!res.ok) return;
        const d = await res.json();
        setTasks(d.tasks || []);
      } catch (e) {
        // ignore
      } finally { setLoading(false); }
    })();
    (async () => {
      setCreatedLoading(true);
      try {
        // secretaries see their own created tasks; MASTER/ADMIN can see all
        const url = isSuperAdmin ? '/api/secretaries/tasks?all=1' : '/api/secretaries/tasks';
        const res = await fetch(url);
        if (!res.ok) return;
        const d = await res.json();
        setCreatedTasks(d.tasks || []);
      } catch (e) {
        // ignore
      } finally { setCreatedLoading(false); }
    })();
  }, [isSuperAdmin, userEmail]);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) return;
      const d = await res.json();
      setTasks(d.tasks || []);
    } catch (e) {
      // ignore
    } finally { setLoading(false); }
    // refresh created tasks too
    setCreatedLoading(true);
    try {
      const url = isSuperAdmin ? '/api/secretaries/tasks?all=1' : '/api/secretaries/tasks';
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setCreatedTasks(d.tasks || []);
      }
    } catch (e) {
      // ignore
    } finally { setCreatedLoading(false); }
  };

  

  const deleteTask = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      const res = await fetch(`/api/secretaries/tasks/${id}`, { method: 'DELETE' });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || 'Delete failed');
      await refresh();
    } catch (err: any) {
      alert('Delete failed: ' + (err?.message || 'Unknown'));
    }
  };

  // Note: Creation is handled on the Secretaries page; Tasks page links there.

  const startEdit = (t: any, source: 'assigned' | 'created' | 'admin') => {
    setEditingId(t.id);
    setEditSource(source);
    setEditTitle(t.title || '');
    setEditDescription(t.description || '');
    setEditPoint(t.pointsPositive ?? '');
    setEditPointsToDeduct(t.pointsNegative ?? '');
    setEditExpire(t.endDate ? new Date(t.endDate).toISOString().slice(0, 16) : '');
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

  const saveEdit = async () => {
    if (!editingId) return;
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

      const res = await fetch(`/api/secretaries/tasks/${editingId}`, { 
        method: 'PATCH', 
        headers: { 'content-type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || 'Update failed');
      setEditingId(null);
      setEditSource(null);
      await refresh();
    } catch (err: any) {
      alert('Update failed: ' + (err?.message || 'Unknown'));
    }
  };

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
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-100' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {item.name}
          </button>
        );
      })}
    </div>
  );

  return (
    <DashboardLayout userRole={(user as any)?.role || (session as any)?.user?.role || 'VOLUNTEER'} userName={(user as any)?.fullName || (session as any)?.user?.name || 'User'} userEmail={(user as any)?.email || (session as any)?.user?.email || ''} userId={(user as any)?.id || (session as any)?.user?.id || ''}>
      <div className="min-h-[calc(100vh-140px)] bg-slate-50/30 py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-800">Tasks</h2>
              <p className="text-slate-500">Your active tasks and recent assignments.</p>
            </div>
            <div className="flex items-center gap-2">
              {canCreate && (
                <Link href="/dashboard/secretaries" className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#0b1c33] rounded-full text-sm font-semibold shadow transition">
                  Create Task
                </Link>
              )}
              <button 
                onClick={refresh} 
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                Refresh
              </button>
            </div>
          </div>

          

          {loading ? (
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-white border border-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {tasks.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v5l3 3"/><circle cx="12" cy="12" r="9"/></svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">No active tasks</h3>
                  <p className="text-slate-500 max-w-xs mx-auto">You don&apos;t have any tasks assigned to you right now. Check back later!</p>
                </div>
              ) : (
                tasks.map(t => (
                  <div key={t.id} className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold text-slate-800">{t.title}</h3>
                          {(() => {
                            try {
                              const createdAt = new Date(t.createdAt);
                              const age = Date.now() - createdAt.getTime();
                              const isNew = age < 48 * 3600 * 1000;
                              return isNew ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                                  New
                                </span>
                              ) : null;
                            } catch (e) { return null; }
                          })()}
                        </div>
                        <p className="text-slate-600 mb-4 leading-relaxed">{t.description}</p>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                            <svg className="text-slate-400" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            <span>Deadline: <span className="text-slate-700 font-medium">{t.endDate ? new Date(t.endDate).toLocaleDateString() : 'No deadline'}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                            <svg className="text-amber-500" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                            <span className="text-amber-700 font-bold">+{t.pointsPositive ?? 0} Points</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col items-center md:items-end gap-3 shrink-0">
                        <button className="w-full md:w-32 px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-100">
                          Open Task
                        </button>
                        {isSuperAdmin && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => startEdit(t, 'assigned')} 
                              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all"
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            </button>
                            <button 
                              onClick={() => deleteTask(t.id)} 
                              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 hover:border-red-100 transition-all"
                              title="Delete"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {editingId === t.id && editSource === 'assigned' && (
                      <div className="mt-6 bg-slate-50 border border-slate-200 p-6 rounded-2xl animate-in fade-in slide-in-from-top-2 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-1">Task Title</label>
                            <input 
                              value={editTitle} 
                              onChange={e=>setEditTitle(e.target.value)} 
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm" 
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-1">Description</label>
                            <textarea 
                              value={editDescription} 
                              onChange={e=>setEditDescription(e.target.value)} 
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" 
                              rows={3} 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-1">Deadline</label>
                            <input type="datetime-local" value={editExpire} onChange={e=>setEditExpire(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-1">Points</label>
                            <input type="number" value={editPoint as any} onChange={e=>setEditPoint(e.target.value==='' ? '' : Number(e.target.value))} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-1">Task Type</label>
                            <select value={editInputType} onChange={e=>setEditInputType(e.target.value as any)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm">
                              <option value="YESNO">Yes / No</option>
                              <option value="COMMENT">Comment</option>
                              <option value="IMAGE">Image</option>
                              <option value="DONATION">Donation</option>
                            </select>
                          </div>
                          <div className="flex flex-col justify-center">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={editMandatory} onChange={e=>setEditMandatory(e.target.checked)} className="h-4 w-4" />
                              <span className="text-xs font-bold text-slate-500 uppercase">Mandatory</span>
                            </label>
                            {editMandatory && (
                              <div className="mt-2">
                                <input type="number" value={editPointsToDeduct as any} onChange={e=>setEditPointsToDeduct(e.target.value==='' ? '' : Number(e.target.value))} placeholder="Deduction points" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs" />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="border-t border-slate-200 pt-4">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Update Audience (Optional)</label>
                          <label className="flex items-center gap-2 mb-3">
                            <input type="checkbox" checked={editTargetAll} onChange={e=>{
                              setEditTargetAll(e.target.checked);
                              if (e.target.checked) { setEditSelectedServices([]); setEditSelectedSectors([]); setEditSelectedClubs([]); }
                            }} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <span className="text-sm font-medium text-slate-600">Notify All Volunteers</span>
                          </label>
                          {!editTargetAll && (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Services</label>
                                {renderButtons(servicesList, editSelectedServices, (id) => {
                                  setEditSelectedServices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                                })}
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Sectors</label>
                                {renderButtons(sectorsList, editSelectedSectors, (id) => {
                                  setEditSelectedSectors(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                                })}
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Clubs</label>
                                {renderButtons(clubsList, editSelectedClubs, (id) => {
                                  setEditSelectedClubs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <button onClick={saveEdit} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm">Save Changes</button>
                          <button onClick={()=>setEditingId(null)} className="px-6 py-2 bg-white border border-slate-200 text-slate-500 font-medium rounded-xl hover:bg-slate-50">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* My Created Tasks (admin only) */}
              {(canCreate) && (
                <div className="mt-16">
                  <div className="flex items-center justify-between mb-6 px-1">
                    <h3 className="text-2xl font-bold text-slate-800">Tasks You Created</h3>
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{createdTasks.filter(t => t.createdByUserId === user?.id).length} Created</span>
                  </div>
                  {createdLoading ? (
                    <div className="h-24 bg-white border border-slate-100 rounded-2xl animate-pulse" />
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {createdTasks.filter(t => t.createdByUserId === user?.id).length === 0 ? (
                        <div className="p-8 bg-white border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 font-medium shadow-sm">No tasks created by you yet.</div>
                      ) : (
                        createdTasks.filter(t => t.createdByUserId === user?.id).map(t => (
                          <div key={t.id} className="bg-white border border-slate-100 rounded-2xl p-6 hover:border-blue-200 transition-colors shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0 pr-4">
                                <div className="text-lg font-bold text-slate-800 truncate">{t.title}</div>
                                <div className="text-sm text-slate-500 truncate">{t.description}</div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button 
                                  onClick={() => startEdit(t, 'created')} 
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                </button>
                                <button 
                                  onClick={() => deleteTask(t.id)} 
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                </button>
                              </div>
                            </div>
                            {editingId === t.id && editSource === 'created' && (
                              <div className="mt-4 bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 px-1">Title</label>
                                    <input value={editTitle} onChange={e=>setEditTitle(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white text-sm font-medium" />
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 px-1">Description</label>
                                    <textarea value={editDescription} onChange={e=>setEditDescription(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white text-sm" rows={2} />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 px-1">Deadline</label>
                                    <input type="datetime-local" value={editExpire} onChange={e=>setEditExpire(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white text-sm" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 px-1">Points</label>
                                    <input type="number" value={editPoint as any} onChange={e=>setEditPoint(e.target.value==='' ? '' : Number(e.target.value))} className="w-full p-2.5 border rounded-xl bg-white text-sm" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 px-1">Type</label>
                                    <select value={editInputType} onChange={e=>setEditInputType(e.target.value as any)} className="w-full p-2.5 border rounded-xl bg-white text-sm">
                                      <option value="YESNO">Yes/No</option>
                                      <option value="COMMENT">Comment</option>
                                      <option value="IMAGE">Image</option>
                                      <option value="DONATION">Donation</option>
                                    </select>
                                  </div>
                                  <div className="flex flex-col justify-center">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input type="checkbox" checked={editMandatory} onChange={e=>setEditMandatory(e.target.checked)} className="h-4 w-4" />
                                      <span className="text-xs font-bold text-slate-500 uppercase">Mandatory</span>
                                    </label>
                                    {editMandatory && <input type="number" value={editPointsToDeduct as any} onChange={e=>setEditPointsToDeduct(e.target.value==='' ? '' : Number(e.target.value))} placeholder="Deduction" className="mt-1 p-2 border rounded-lg bg-white text-xs" />}
                                  </div>
                                </div>
                                <div className="border-t border-slate-200 pt-4">
                                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Update Audience (Optional)</label>
                                  <label className="flex items-center gap-2 mb-3">
                                    <input type="checkbox" checked={editTargetAll} onChange={e=>{
                                      setEditTargetAll(e.target.checked);
                                      if (e.target.checked) { setEditSelectedServices([]); setEditSelectedSectors([]); setEditSelectedClubs([]); }
                                    }} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                    <span className="text-sm font-medium text-slate-600">Notify All Volunteers</span>
                                  </label>
                                  {!editTargetAll && (
                                    <div className="space-y-4">
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Services</label>
                                        {renderButtons(servicesList, editSelectedServices, (id) => {
                                          setEditSelectedServices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                                        })}
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Sectors</label>
                                        {renderButtons(sectorsList, editSelectedSectors, (id) => {
                                          setEditSelectedSectors(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                                        })}
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Clubs</label>
                                        {renderButtons(clubsList, editSelectedClubs, (id) => {
                                          setEditSelectedClubs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2 pt-2">
                                  <button onClick={saveEdit} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium">Save</button>
                                  <button onClick={()=>setEditingId(null)} className="px-4 py-1.5 bg-white border rounded-lg text-sm font-medium">Cancel</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

          {/* Admin - View/Edit All Tasks (MASTER and ADMIN only) */}
          {isSuperAdmin && (
            <div className="mt-16 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-[#07223f]">System Administration</h3>
                  <p className="text-slate-500 text-sm">View and manage all organization tasks from one place.</p>
                </div>
                <div className="px-4 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full uppercase tracking-widest">
                  {createdTasks.filter(t => t.createdByUserId !== user?.id).length} System Tasks
                </div>
              </div>

              {createdLoading ? (
                <div className="grid grid-cols-1 gap-4">
                  {[1, 2].map(i => <div key={i} className="h-24 bg-slate-50 rounded-2xl animate-pulse" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {createdTasks.filter(t => t.createdByUserId !== user?.id).length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-medium">
                      No other tasks found in the system.
                    </div>
                  ) : (
                    createdTasks.filter(t => t.createdByUserId !== user?.id).map(t => (
                      <div key={t.id} className="group bg-white border border-slate-100 rounded-2xl p-6 hover:border-blue-200 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 pr-4">
                            <div className="text-lg font-bold text-[#07223f] group-hover:text-blue-700 transition-colors">{t.title}</div>
                            <div className="text-sm text-slate-500 line-clamp-1">{t.description}</div>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-50 px-2 py-0.5 rounded border">ID: {t.id.slice(-6)}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-50 px-2 py-0.5 rounded border">Created By: {t.createdByUserId === user?.id ? 'You' : 'Another Admin'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => startEdit(t, 'admin')} 
                              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                            >
                              Edit Task
                            </button>
                            <button 
                              onClick={() => deleteTask(t.id)} 
                              className="px-4 py-2 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        {editingId === t.id && editSource === 'admin' && (
                          <div className="mt-6 bg-slate-50 border border-slate-200 p-6 rounded-2xl animate-in fade-in slide-in-from-top-2 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="md:col-span-2">
                                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 px-1">Title</label>
                                <input value={editTitle} onChange={e=>setEditTitle(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all" />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 px-1">Description</label>
                                <textarea value={editDescription} onChange={e=>setEditDescription(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-500 transition-all" rows={2} />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 px-1">Deadline</label>
                                <input type="datetime-local" value={editExpire} onChange={e=>setEditExpire(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sm" />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 px-1">Points</label>
                                <input type="number" value={editPoint as any} onChange={e=>setEditPoint(e.target.value==='' ? '' : Number(e.target.value))} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sm" />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 px-1">Type</label>
                                <select value={editInputType} onChange={e=>setEditInputType(e.target.value as any)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sm">
                                  <option value="YESNO">Yes/No</option>
                                  <option value="COMMENT">Comment</option>
                                  <option value="IMAGE">Image</option>
                                  <option value="DONATION">Donation</option>
                                </select>
                              </div>
                              <div className="flex flex-col justify-center">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" checked={editMandatory} onChange={e=>setEditMandatory(e.target.checked)} className="h-4 w-4" />
                                  <span className="text-[10px] uppercase font-bold text-slate-400">Mandatory</span>
                                </label>
                                {editMandatory && <input type="number" value={editPointsToDeduct as any} onChange={e=>setEditPointsToDeduct(e.target.value==='' ? '' : Number(e.target.value))} placeholder="Deduction" className="mt-1 p-2 border border-slate-200 rounded-lg bg-white text-xs" />}
                              </div>
                            </div>

                            <div className="border-t border-slate-200 pt-4">
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Update Audience (Optional)</label>
                              <label className="flex items-center gap-2 mb-3">
                                <input type="checkbox" checked={editTargetAll} onChange={e=>{
                                  setEditTargetAll(e.target.checked);
                                  if (e.target.checked) { setEditSelectedServices([]); setEditSelectedSectors([]); setEditSelectedClubs([]); }
                                }} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                <span className="text-sm font-medium text-slate-600">Notify All Volunteers</span>
                              </label>
                              {!editTargetAll && (
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Services</label>
                                    {renderButtons(servicesList, editSelectedServices, (id) => {
                                      setEditSelectedServices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                                    })}
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Sectors</label>
                                    {renderButtons(sectorsList, editSelectedSectors, (id) => {
                                      setEditSelectedSectors(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                                    })}
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Clubs</label>
                                    {renderButtons(clubsList, editSelectedClubs, (id) => {
                                      setEditSelectedClubs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2 justify-end pt-2 border-t border-slate-200 mt-2">
                              <button onClick={saveEdit} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors">Save System Changes</button>
                              <button onClick={()=>{setEditingId(null); setEditSource(null);}} className="px-6 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
