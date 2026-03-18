"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useModal } from "@/components/ui/ModalProvider";

export default function DonationsListPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useModal();
  const [donations, setDonations] = useState<Array<any>>([]);
  const [manageData, setManageData] = useState<Array<any>>([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [processingSubmissionId, setProcessingSubmissionId] = useState<string | null>(null);

  const userStatus = (session as any)?.user?.status;
  const role = (session as any)?.user?.role || '';
  const STAFF_ROLES = ['HR', 'MASTER', 'ADMIN', 'DIRECTOR', 'DATABASE_DEPT', 'SECRETARIES'];
  const isOfficialOrStaff = STAFF_ROLES.includes(role) || userStatus === 'OFFICIAL';
  const canManage = role === 'ADMIN' || role === 'MASTER';

  const loadDonations = async () => {
    try {
      const res = await fetch('/api/donations');
      if (!res.ok) return;
      const data = await res.json();
      setDonations(data.donations || []);
    } catch {
      // ignore
    }
  };

  const loadManageData = async () => {
    if (!canManage) return;
    setManageLoading(true);
    try {
      const res = await fetch('/api/donations/manage', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load manage data');
      setManageData(data.campaigns || []);
    } catch (e: any) {
      toast(e?.message || 'Failed to load manage data', { type: 'error' });
    } finally {
      setManageLoading(false);
    }
  };

  const verifySubmission = async (submissionId: string, action: 'APPROVE' | 'REJECT') => {
    if (processingSubmissionId) return;
    setProcessingSubmissionId(submissionId);
    try {
      const res = await fetch(`/api/donations/submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Failed to ${action.toLowerCase()} submission`);
      toast(`Submission ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`, { type: 'success' });
      await Promise.all([loadDonations(), loadManageData()]);
    } catch (e: any) {
      toast(e?.message || 'Verification failed', { type: 'error' });
    } finally {
      setProcessingSubmissionId(null);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    // Skip donations API call for non-official, non-staff users
    if (!STAFF_ROLES.includes(role) && userStatus !== 'OFFICIAL') return;
    (async () => {
      await loadDonations();
      if (canManage) {
        await loadManageData();
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, userStatus, role, canManage]);

  const displayName = (session as any)?.user?.name || (session as any)?.user?.email || "User";

  if (session?.user && !isOfficialOrStaff) {
    return (
      <DashboardLayout userRole={role || 'VOLUNTEER'} userName={displayName} userEmail={(session as any)?.user?.email || ''} userId={(session as any)?.user?.id || ''}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Official Members Only</h2>
          <p className="text-slate-500 max-w-sm">Donation campaigns are available exclusively to official ASAD members. Complete your membership to unlock this section.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={role || "VOLUNTEER"} userName={displayName} userEmail={(session as any)?.user?.email || ""} userId={(session as any)?.user?.id || ""}>
      <div className="min-h-[calc(100vh-140px)] bg-slate-50/30 py-3 px-3 sm:py-10 sm:px-4">
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

                    <div className="mb-4 rounded-xl border border-slate-100 p-3 bg-slate-50">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Approved</span>
                        <span>৳{Number(d.approvedAmount || 0).toLocaleString()} / ৳{Number(d.amountTarget || 0).toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, d.amountTarget > 0 ? (Number(d.approvedAmount || 0) / Number(d.amountTarget)) * 100 : 0)}%` }} />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5">Remaining: ৳{Number(d.remainingAmount || 0).toLocaleString()}</p>
                    </div>
                    
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

          {canManage && (
            <div className="mt-10">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Manage Submissions</h2>
              <p className="text-slate-500 mt-1">Verify pending donation submissions for each campaign.</p>

              <div className="mt-4 space-y-4">
                {manageLoading ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-500">Loading manage section...</div>
                ) : manageData.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-500">No campaigns available for management.</div>
                ) : (
                  manageData.map((campaign: any) => (
                    <div key={campaign.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <div>
                          <h3 className="font-bold text-slate-800">{campaign.purpose || campaign.title}</h3>
                          <p className="text-xs text-slate-500">Pending: {campaign.pendingCount} • Remaining: ৳{Number(campaign.remainingAmount || 0).toLocaleString()} • Status: {campaign.status}</p>
                        </div>
                        <a href={`/dashboard/donations/${campaign.id}`} className="text-sm font-semibold text-blue-700 hover:text-blue-800">Open Details</a>
                      </div>

                      {campaign.pendingSubmissions?.length ? (
                        <div className="space-y-2">
                          {campaign.pendingSubmissions.map((submission: any) => (
                            <div key={submission.id} className="border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-700 truncate">{submission.user?.fullName || 'Volunteer'} {submission.user?.volunteerId ? `(#${submission.user.volunteerId})` : ''}</p>
                                <p className="text-xs text-slate-500">TRXID: {submission.trxId} • Amount: ৳{Number(submission.amount || 0).toLocaleString()} • {new Date(submission.donatedAt).toLocaleString()}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={processingSubmissionId === submission.id}
                                  onClick={() => verifySubmission(submission.id, 'APPROVE')}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={processingSubmissionId === submission.id}
                                  onClick={() => verifySubmission(submission.id, 'REJECT')}
                                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No pending submissions for this campaign.</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
