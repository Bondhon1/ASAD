"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useCachedUserProfile } from '@/hooks/useCachedUserProfile';

export default function ServicesPage() {
  const { user } = useCachedUserProfile<string | null>(typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null);
  const { data: session } = useSession();
  const [stats, setStats] = useState<Array<any>>([]);
  const [services, setServices] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [auto, setAuto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [r1, r2] = await Promise.all([
          fetch('/api/hr/services/institute-stats'),
          fetch('/api/hr/services'),
        ]);
        const d1 = await r1.json();
        const d2 = await r2.json();
        if (r1.ok) setStats(d1.stats || []);
        if (r2.ok) setServices(d2.services || []);
      } catch (e) {
        console.error(e);
      } finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const createService = async () => {
    setError(null);
    if (!name.trim()) return setError('Name is required');
    setCreating(true);
    try {
      const res = await fetch('/api/hr/services', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: name.trim(), code: code.trim() || undefined, auto }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create');
      setServices(prev => [data.service, ...prev]);
      setName(''); setCode('');
    } catch (err: any) {
      setError(err?.message || 'Error');
    } finally { setCreating(false); }
  };

  return (
    <DashboardLayout
      userRole={(user as any)?.role || (session as any)?.user?.role || 'HR'}
      userName={(user as any)?.fullName || (session as any)?.user?.name || 'HR'}
      userEmail={(user as any)?.email || (session as any)?.user?.email || ''}
      userId={(user as any)?.id || (session as any)?.user?.id || ''}
      topbarName={(user as any)?.fullName || (session as any)?.user?.name || 'Services & Institute Stats'}
      topbarLabel={(user as any)?.role || (session as any)?.user?.role || ''}
    >
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-semibold mb-4">Services & Institute Stats</h2>

        <div className="bg-white border rounded p-4 mb-6">
          <h3 className="font-medium">Create Service</h3>
          <div className="mt-3 flex gap-2 flex-wrap">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Service name" className="px-3 py-2 border rounded w-full md:w-2/3" />
              <input value={code} onChange={e => setCode(e.target.value)} placeholder="Optional code" className="px-3 py-2 border rounded w-full md:w-1/3" />
              <label className="flex items-center gap-2 ml-2">
                <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
                <span className="text-sm text-gray-700">Auto assign</span>
              </label>
            <div className="w-full">
              <button disabled={creating} onClick={createService} className="px-3 py-2 bg-[#0b2545] text-white rounded mt-2">Create</button>
              {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border rounded p-4">
            <h3 className="font-medium mb-3">Institute Volunteer Counts</h3>
            {loading ? <div>Loading…</div> : (
              <div className="space-y-2">
                {stats.map(s => (
                  <div key={s.instituteId} className="flex items-center justify-between">
                    <div className="text-sm">{s.name}</div>
                    <div className="text-sm font-medium">{s.volunteersCount}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border rounded p-4">
            <h3 className="font-medium mb-3">Existing Services</h3>
            {loading ? <div>Loading…</div> : (
              <div className="space-y-2">
                {services.map(s => (
                  <div key={s.id} className="flex items-center justify-between">
                    <div className="text-sm">{s.name}</div>
                    <div className="text-xs text-gray-500">{s.code || '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
