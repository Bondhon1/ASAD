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
      <div className="min-h-[calc(100vh-140px)] py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#0b1c33]">Donations</p>
              <h1 className="text-3xl md:text-4xl font-semibold text-[#0b1c33]">Donation Campaigns</h1>
              <p className="text-sm text-[#0b1c33]">Public and internal donation campaigns.</p>
            </div>
            {(role === 'ADMIN' || role === 'MASTER') && (
              <a href="/dashboard/donations/create" className="px-4 py-2 rounded-md bg-[#2b6cb0] text-white">Create Donation</a>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {donations.length === 0 ? (
              <div className="p-6 bg-white border border-slate-200 rounded-lg text-sm text-slate-600">No donation campaigns yet.</div>
            ) : (
              donations.map((d:any) => (
                <div key={d.id || d.purpose} className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{d.purpose || d.title}</h3>
                    <p className="text-sm text-slate-600">Payment Numbers: {d.bkashNumber || '-'} {d.nagadNumber ? ' • Nagad: ' + d.nagadNumber : ''}</p>
                    <div className="text-xs text-slate-500 mt-2">Target: {d.amountTarget ?? '—'} • Expires: {d.expiryDate ?? '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm" href={`/dashboard/donations/${d.id}`}>Details</a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
