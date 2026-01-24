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
  const [loading, setLoading] = useState(true);

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
  }, []);

  return (
    <DashboardLayout userRole={(user as any)?.role || (session as any)?.user?.role || 'VOLUNTEER'} userName={(user as any)?.fullName || (session as any)?.user?.name || 'User'} userEmail={(user as any)?.email || (session as any)?.user?.email || ''} userId={(user as any)?.id || (session as any)?.user?.id || ''}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-semibold text-[#07223f] mb-4">Tasks</h2>
        {loading ? <div>Loading…</div> : (
          <div className="space-y-4">
            {tasks.length === 0 ? <div className="bg-white border rounded p-4">No active tasks</div> : (
              tasks.map(t => (
                <div key={t.id} className="bg-white border rounded p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-[#07223f]">{t.title}</div>
                      <div className="text-sm text-gray-600">{t.description}</div>
                      <div className="text-xs text-gray-500 mt-2">Deadline: {t.endDate ? new Date(t.endDate).toLocaleString() : '—'}</div>
                    </div>
                    <div className="text-sm">
                      <div className="text-right">Points: {t.pointsPositive ?? 0}</div>
                      <div className="mt-2"><button className="px-3 py-1 bg-[#07223f] text-white rounded">Open</button></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
