"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
  const [serviceName, setServiceName] = useState('');
  const [instituteName, setInstituteName] = useState('');
  const [auto, setAuto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // institutes list pagination/search
  const [instQuery, setInstQuery] = useState('');
  const [instPage, setInstPage] = useState(1);
  const [instPageSize, setInstPageSize] = useState(20);
  const [instTotal, setInstTotal] = useState(0);

  // selected service -> users
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [serviceUsers, setServiceUsers] = useState<Array<any>>([]);
  const [serviceUsersPage, setServiceUsersPage] = useState(1);
  const [serviceUsersPageSize, setServiceUsersPageSize] = useState(20);
  const [serviceUsersTotal, setServiceUsersTotal] = useState(0);
  const [serviceUsersLoading, setServiceUsersLoading] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [r1, r2] = await Promise.all([
          fetch(`/api/hr/services/institute-stats?q=${encodeURIComponent(instQuery)}&page=${instPage}&pageSize=${instPageSize}`),
          fetch('/api/hr/services'),
        ]);
        const d1 = await r1.json();
        const d2 = await r2.json();
        if (r1.ok) {
          setStats(d1.stats || []);
          setInstTotal(d1.total || (d1.stats || []).length);
        }
        if (r2.ok) setServices(d2.services || []);
      } catch (e) {
        console.error(e);
      } finally { setLoading(false); }
    };
    fetchAll();
  }, [instPage, instPageSize, instQuery]);

  const createService = async () => {
    setError(null);
    if (!serviceName.trim()) return setError('Service name is required');
    if (!instituteName.trim()) return setError('Institute name is required');
    setCreating(true);
    try {
      const res = await fetch('/api/hr/services', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ serviceName: serviceName.trim(), instituteName: instituteName.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create');
      setServices(prev => [ { id: data.service.id, name: data.service.name, code: data.service.code, usersCount: 0, institute: { id: data.service.instituteId, name: instituteName } }, ...prev]);
      setServiceName(''); setInstituteName('');
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#0b2545]/70">Operations</p>
            <h2 className="text-2xl font-semibold text-[#0b2545]">Services & Institutes</h2>
            <p className="text-sm text-gray-500">Create services, see institute counts, and inspect assigned users.</p>
          </div>
        </div>

        <div className="bg-white border border-[#dbe3f1] rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#0b2545]">Create Service</h3>
            <span className="text-xs text-gray-500">Service + institute are required</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={serviceName} onChange={e => setServiceName(e.target.value)} placeholder="Service name" className="px-3 py-2 border border-[#dbe3f1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b2545]/40" />
            <input value={instituteName} onChange={e => setInstituteName(e.target.value)} placeholder="Institute name" className="px-3 py-2 border border-[#dbe3f1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b2545]/40" />
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button disabled={creating} onClick={createService} className="px-4 py-2 rounded-lg bg-[#0b2545] text-white font-semibold shadow hover:shadow-md transition disabled:opacity-60">Create</button>
            {error && <div className="text-sm text-red-600">{error}</div>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-[#dbe3f1] rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-[#0b2545]">Institute Volunteer Counts</h3>
                <p className="text-sm text-gray-500">Sorted by volunteer count, filters out zero-count.</p>
              </div>
            </div>
            <div className="mb-3 flex gap-2">
              <input placeholder="Search institutes" value={instQuery} onChange={e => { setInstQuery(e.target.value); setInstPage(1); }} className="px-3 py-2 border border-[#dbe3f1] rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[#0b2545]/30" />
            </div>
            {loading ? <div>Loading…</div> : (
              <div className="divide-y divide-[#eef2fb]">
                {stats.map(s => (
                  <div key={s.instituteId} className="flex items-center justify-between py-2">
                    <div className="text-sm font-medium text-gray-800 truncate">{s.name}</div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-[#0b2545]">{s.volunteersCount}</div>
                      <button
                        onClick={async () => {
                          setSelectedService({ id: s.instituteId, name: s.name, isInstitute: true });
                          setSelectedServiceId(s.instituteId);
                          setShowUsersModal(true);
                          setServiceUsersLoading(true);
                          try {
                            const r = await fetch(`/api/hr/institutes/${s.instituteId}/users?page=1&pageSize=${serviceUsersPageSize}`);
                            const d = await r.json();
                            if (r.ok) {
                              setServiceUsers(d.users || []);
                              setServiceUsersTotal(d.total || 0);
                              setServiceUsersPage(1);
                            }
                          } catch (e) { console.error(e); } finally { setServiceUsersLoading(false); }
                        }}
                        className="px-3 py-1 rounded-lg bg-[#0b2545] text-white text-sm font-semibold shadow hover:shadow-md transition"
                      >
                        View users
                      </button>
                    </div>
                  </div>
                ))}
                <div className="pt-3 flex items-center justify-between text-sm text-gray-600">
                  <div>Showing {(instPage-1)*instPageSize + 1} - {Math.min(instPage*instPageSize, instTotal)} of {instTotal}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setInstPage(p => Math.max(1, p-1))} disabled={instPage<=1} className="px-2 py-1 border border-[#dbe3f1] rounded-lg text-xs disabled:opacity-50">Prev</button>
                    <div className="text-xs">Page {instPage}</div>
                    <button onClick={() => setInstPage(p => p+1)} disabled={instPage*instPageSize >= instTotal} className="px-2 py-1 border border-[#dbe3f1] rounded-lg text-xs disabled:opacity-50">Next</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-[#f6f9ff] to-white border border-[#dbe3f1] rounded-2xl shadow-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-[#0b2545]">Existing Services</h3>
                <p className="text-sm text-gray-500">Tap a card to view assigned users.</p>
              </div>
              <span className="px-2 py-1 rounded-full bg-white border border-[#dbe3f1] text-xs text-gray-500 shadow-sm">Navy actions</span>
            </div>
            {loading ? <div>Loading…</div> : (
              <div className="space-y-3">
                {services.map(s => (
                  <div
                    key={s.id}
                    className="bg-white border border-[#dbe3f1] rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition duration-150"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex-1 min-w-0 flex items-center gap-3">
                        <div className="text-sm font-semibold text-gray-900">{s.code || '—'}</div>
                        <div className="text-xs px-2 py-1 rounded-full bg-[#0b2545]/10 text-[#0b2545] font-medium">{s.usersCount || 0} users</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            setSelectedService(s);
                            setSelectedServiceId(s.id);
                            setShowUsersModal(true);
                            setServiceUsersLoading(true);
                            try {
                              const r = await fetch(`/api/hr/services/${s.id}/users?page=1&pageSize=${serviceUsersPageSize}`);
                              const d = await r.json();
                              if (r.ok) {
                                setServiceUsers(d.users || []);
                                setServiceUsersTotal(d.total || 0);
                                setServiceUsersPage(1);
                              }
                            } catch (e) { console.error(e); } finally { setServiceUsersLoading(false); }
                          }}
                          className="px-3 py-2 rounded-lg bg-[#0b2545] text-white text-sm font-semibold shadow hover:shadow-md transition"
                        >
                          View users
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Users Modal */}
      {showUsersModal && selectedService && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Users in {selectedService.name}</h3>
                <div className="text-sm text-gray-500">Code: {selectedService.code || '—'} · {selectedService.institute?.name || (selectedService.isGlobal ? 'Global' : 'Unassigned')}</div>
              </div>
              <button onClick={() => { setShowUsersModal(false); setSelectedService(null); setServiceUsers([]); }} className="text-gray-500 hover:text-gray-700">×</button>
            </div>

            {serviceUsersLoading ? (
              <div className="py-10 text-center text-gray-600">Loading users...</div>
            ) : serviceUsers.length === 0 ? (
              <div className="py-10 text-center text-gray-500">No users assigned to this service.</div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {serviceUsers.map(u => (
                  <div key={u.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{u.fullName || u.username || u.email}</div>
                      <div className="text-sm text-gray-500">{u.email}</div>
                    </div>
                    <div className="text-sm text-gray-700">{u.volunteerProfile?.isOfficial ? 'Official' : u.status}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">Showing {(serviceUsersPage-1)*serviceUsersPageSize + 1} - {Math.min(serviceUsersPage*serviceUsersPageSize, serviceUsersTotal)} of {serviceUsersTotal}</div>
              <div className="flex items-center gap-2">
                <button onClick={async ()=>{
                  const np = Math.max(1, serviceUsersPage-1);
                  setServiceUsersPage(np);
                  setServiceUsersLoading(true);
                  try {
                    const r = await fetch(`/api/hr/services/${selectedServiceId}/users?page=${np}&pageSize=${serviceUsersPageSize}`);
                    const d = await r.json();
                    if (r.ok) { setServiceUsers(d.users || []); setServiceUsersTotal(d.total || 0); }
                  } catch(e){console.error(e);} finally{ setServiceUsersLoading(false); }
                }} disabled={serviceUsersPage<=1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
                <div className="text-sm">Page {serviceUsersPage}</div>
                <button onClick={async ()=>{
                  const np = serviceUsersPage + 1;
                  setServiceUsersPage(np);
                  setServiceUsersLoading(true);
                  try {
                    const r = await fetch(`/api/hr/services/${selectedServiceId}/users?page=${np}&pageSize=${serviceUsersPageSize}`);
                    const d = await r.json();
                    if (r.ok) { setServiceUsers(d.users || []); setServiceUsersTotal(d.total || 0); }
                  } catch(e){console.error(e);} finally{ setServiceUsersLoading(false); }
                }} disabled={serviceUsersPage*serviceUsersPageSize >= serviceUsersTotal} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}
