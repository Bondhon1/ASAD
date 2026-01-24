"use client";

import { useEffect, useState } from 'react';
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
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const isAdmin = ((user as any)?.role || (session as any)?.user?.role || '') && ['SECRETARIES','MASTER'].includes(((user as any)?.role || (session as any)?.user?.role || ''));

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
        const url = isAdmin ? '/api/secretaries/tasks?all=1' : '/api/secretaries/tasks';
        const res = await fetch(url);
        if (!res.ok) return;
        const d = await res.json();
        setCreatedTasks(d.tasks || []);
      } catch (e) {
        // ignore
      } finally { setCreatedLoading(false); }
    })();
  }, [isAdmin, userEmail]);

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
      const url = isAdmin ? '/api/secretaries/tasks?all=1' : '/api/secretaries/tasks';
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

  const startEdit = (t: any) => {
    setEditingId(t.id);
    setEditTitle(t.title || '');
    setEditDescription(t.description || '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await fetch(`/api/secretaries/tasks/${editingId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: editTitle, description: editDescription }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || 'Update failed');
      setEditingId(null);
      await refresh();
    } catch (err: any) {
      alert('Update failed: ' + (err?.message || 'Unknown'));
    }
  };

  return (
    <DashboardLayout userRole={(user as any)?.role || (session as any)?.user?.role || 'VOLUNTEER'} userName={(user as any)?.fullName || (session as any)?.user?.name || 'User'} userEmail={(user as any)?.email || (session as any)?.user?.email || ''} userId={(user as any)?.id || (session as any)?.user?.id || ''}>
      <div className="min-h-[calc(100vh-140px)] bg-transparent py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-[#07223f]">Tasks</h2>
              <p className="text-sm text-slate-600">Your active tasks and recent assignments.</p>
            </div>
            <div>
              <button onClick={refresh} className="px-3 py-1 bg-white border rounded">Refresh</button>
            </div>
          </div>

          {loading ? <div>Loading…</div> : (
            <div className="grid grid-cols-1 gap-4">
              {tasks.length === 0 ? <div className="bg-white border rounded p-6">No active tasks</div> : (
                tasks.map(t => (
                  <div key={t.id} className="bg-white border rounded-2xl p-5 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-lg font-semibold text-[#07223f]">{t.title}</div>
                          {(() => {
                            try {
                              const createdAt = new Date(t.createdAt);
                              const age = Date.now() - createdAt.getTime();
                              const isNew = age < 48 * 3600 * 1000;
                              return isNew ? <span className="text-xs bg-[#e6f2ff] text-[#0b3a66] px-2 py-0.5 rounded">New</span> : null;
                            } catch (e) { return null; }
                          })()}
                        </div>
                        <div className="text-sm text-slate-700 mb-2">{t.description}</div>
                        <div className="text-xs text-slate-500">Deadline: {t.endDate ? new Date(t.endDate).toLocaleString() : '—'}</div>
                      </div>

                      <div className="w-full md:w-48 flex flex-col items-end gap-3">
                        <div className="text-sm">Points: <strong>{t.pointsPositive ?? 0}</strong></div>
                        <div className="flex items-center gap-2">
                          <button className="px-3 py-1 bg-[#2b6cb0] text-white rounded">Open</button>
                          {isAdmin && (
                            <>
                              <button onClick={() => startEdit(t)} className="px-3 py-1 bg-white border rounded">Edit</button>
                              <button onClick={() => deleteTask(t.id)} className="px-3 py-1 bg-red-600 text-white rounded">Delete</button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {editingId === t.id && (
                      <div className="mt-4 bg-slate-50 p-4 rounded">
                        <div className="mb-2">
                          <input value={editTitle} onChange={e=>setEditTitle(e.target.value)} className="w-full p-2 border rounded" />
                        </div>
                        <div className="mb-2">
                          <textarea value={editDescription} onChange={e=>setEditDescription(e.target.value)} className="w-full p-2 border rounded" rows={3} />
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={saveEdit} className="px-3 py-1 bg-[#2b6cb0] text-white rounded">Save</button>
                          <button onClick={()=>setEditingId(null)} className="px-3 py-1 bg-white border rounded">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
          {/* My Created Tasks (admin only) */}
          {isAdmin && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-[#07223f] mb-3">My Created Tasks</h3>
              {createdLoading ? <div>Loading…</div> : (
                <div className="grid grid-cols-1 gap-4">
                  {createdTasks.length === 0 ? <div className="bg-white border rounded p-6">No created tasks</div> : (
                    createdTasks.map(t => (
                      <div key={t.id} className="bg-white border rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-semibold text-[#07223f]">{t.title}</div>
                            <div className="text-sm text-slate-700">{t.description}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => startEdit(t)} className="px-3 py-1 bg-white border rounded">Edit</button>
                            <button onClick={() => deleteTask(t.id)} className="px-3 py-1 bg-red-600 text-white rounded">Delete</button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Admin - View/Edit All Tasks */}
          {isAdmin && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-[#07223f] mb-3">Admin — View & Edit All Tasks</h3>
              {createdLoading ? <div>Loading…</div> : (
                <div className="grid grid-cols-1 gap-4">
                  {createdTasks.length === 0 ? <div className="bg-white border rounded p-6">No tasks available</div> : (
                    createdTasks.map(t => (
                      <div key={t.id} className="bg-white border rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-semibold text-[#07223f]">{t.title}</div>
                            <div className="text-sm text-slate-700">{t.description}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => startEdit(t)} className="px-3 py-1 bg-white border rounded">Edit</button>
                            <button onClick={() => deleteTask(t.id)} className="px-3 py-1 bg-red-600 text-white rounded">Delete</button>
                          </div>
                        </div>
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
