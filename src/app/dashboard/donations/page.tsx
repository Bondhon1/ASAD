"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function DonationsListPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [donations, setDonations] = useState<Array<any>>([]);

  useEffect(() => {
    if (status === "loading") return;
    (async () => {
      try {
        const res = await fetch('/api/donations');
        if (!res.ok) return;
        const data = await res.json();
        setDonations(data.donations || []);
      } catch (e) {
        // ignore
      }
    })();
  }, [status]);

  const role = (session as any)?.user?.role;
  const displayName = (session as any)?.user?.name || (session as any)?.user?.email || "User";

  return (
    <DashboardLayout userRole={role || "VOLUNTEER"} userName={displayName} userEmail={(session as any)?.user?.email || ""} userId={(session as any)?.user?.id || ""}>
      <div className="min-h-[calc(100vh-140px)] bg-slate-50/30 py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-10 h-1 bg-blue-600 rounded-full" />
                <p className="text-xs uppercase tracking-[0.2em] font-bold text-blue-600">Impact</p>
              </div>
              <h1 className="text-4xl font-black text-slate-800 tracking-tight">Donation Campaigns</h1>
              <p className="text-slate-500 mt-2">Scale our impact through public and internal donation campaigns.</p>
            </div>
            {(role === 'ADMIN' || role === 'MASTER') && (
              <a 
                href="/dashboard/donations/create" 
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                Create Campaign
              </a>
            )}
          </div>

          {donations.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              </div>
              <h2 className="text-xl font-bold text-slate-800">No active campaigns</h2>
              <p className="text-slate-500 max-w-xs mx-auto mt-2">There are no active donation campaigns at the moment. Stay tuned!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {donations.map((d:any) => (
                <div key={d.id || d.purpose} className="group bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col">
                  <div className="h-3 bg-blue-600" />
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                      </div>
                      {d.expiryDate && (
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full border border-slate-200">
                          {new Date(d.expiryDate) < new Date() ? 'Expired' : 'Active'}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">{d.purpose || d.title}</h3>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                          <svg className="text-slate-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
                        </div>
                        <span className="truncate">{d.bkashNumber || 'No bKash'} {d.nagadNumber ? ` • ${d.nagadNumber}` : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                          <svg className="text-slate-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <span>Ends: {d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : '—'}</span>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Amount</span>
                        <span className="text-lg font-black text-slate-800">৳{d.amountTarget?.toLocaleString() ?? 0}</span>
                      </div>
                      <a 
                        href={`/dashboard/donations/${d.id}`} 
                        className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
