"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";

interface User {
  id: string;
  email: string;
  fullName: string | null;
  username: string | null;
  status: string;
  role: string;
  volunteerId: string | null;
  institute: { name: string } | null;
  volunteerProfile: { points?: number; isOfficial?: boolean; rank?: string | null; service?: { id?: string; name?: string | null } | null; sectors?: string[]; clubs?: string[] } | null;
  initialPayment: { status: string } | null;
  profilePicUrl?: string | null;
  division?: string | null;
  district?: string | null;
  upazila?: string | null;
  addressLine?: string | null;
  coins?: number;
  experiences?: Array<{
    id: string;
    title: string;
    organization?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    isCurrent?: boolean;
  }>;
  // from profile API include
  taskSubmissions?: Array<{
    id: string;
    status: string;
    submittedAt: string;
    task: { id: string; title: string } | null;
  }>;
  donations?: Array<{
    id: string;
    amount: number;
    status: string;
    donatedAt: string;
    trxId?: string;
    paymentMethod?: string;
  }>;
  followersCount?: number;
  followingCount?: number;
  finalPayment?: { status: string } | null;
}

const formatDateRange = (start?: string | null, end?: string | null, isCurrent?: boolean) => {
  const options: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' };
  const startText = start ? new Date(start).toLocaleDateString('en-US', options) : '';
  const endText = isCurrent ? 'Present' : end ? new Date(end).toLocaleDateString('en-US', options) : '';
  if (startText && endText) return `${startText} – ${endText}`;
  if (startText) return `Started ${startText}`;
  return endText || '';
};

// Format date in Dhaka timezone (UTC+6)
const formatDhakaDate = (dateStr: string | Date) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka', month: 'short', day: 'numeric' });
};

type TabKey = "experience" | "tasks" | "donations";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<TabKey>("experience");
  const userEmail = session?.user?.email || (typeof window !== "undefined" ? localStorage.getItem("userEmail") : null);
  const { user, loading: userLoading, error, refresh } = useCachedUserProfile<User>(userEmail);
  const [pendingTasks, setPendingTasks] = useState<any[] | null>(null);
  const [pendingTasksLoading, setPendingTasksLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<any[] | null>(null);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [taskSubmissionMap, setTaskSubmissionMap] = useState<Record<string, any>>({});
  const hasRefreshedForPayment = useRef(false);
  
  // Coin withdrawal states
  const [showCoinModal, setShowCoinModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawCoins, setWithdrawCoins] = useState<number | ''>('');
  const [withdrawMethod, setWithdrawMethod] = useState('bkash');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);

  // Points history modal state
  const [showPointsModal, setShowPointsModal] = useState(false);
  // Rank status modal state
  const [showRankModal, setShowRankModal] = useState(false);
  // Shared data fetched once for both modals
  const [pointsData, setPointsData] = useState<{
    history: Array<{ id: string; change: number; reason: string; createdAt: string; relatedTask: { id: string; title: string } | null; relatedDonation: { id: string; amount: number } | null }>;
    currentPoints: number;
    currentRankName: string | null;
    currentRankThreshold: number;
    nextRankName: string | null;
    nextRankThreshold: number | null;
    rankSequence: Array<{ name: string; thresholdPoints: number }>;
  } | null>(null);
  const [pointsDataLoading, setPointsDataLoading] = useState(false);
  const pointsDataFetched = useRef(false);

  useEffect(() => {
    if (status !== "unauthenticated") return;
    // If the userEmail was stored (email-verification -> payment flow), allow access
    // and let the subsequent logic handle redirect to payment if needed.
    const storedEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;
    if (!storedEmail) {
      router.push("/auth");
    }
  }, [router, status]);

  useEffect(() => {
    if (status === "loading") return;

    if (!userEmail) {
      router.push("/auth");
      return;
    }

    if (!user && !userLoading && !error) {
      refresh();
      return;
    }

    if (error) {
      router.push("/auth");
    }
    
    // If paymentSubmitted=1, set a sessionStorage flag immediately so other
    // effects can detect a recent submission and skip auto-redirects. If the
    // user data is already available, also force a refresh once.
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("paymentSubmitted")) {
        try {
          const skipUntil = Date.now() + 20000;
          sessionStorage.setItem('skipPaymentRedirectUntil', skipUntil.toString());
        } catch (e) {
          // ignore storage errors
        }

        if (user && !hasRefreshedForPayment.current) {
          console.log('[Dashboard] Payment submitted, refreshing user data...');
          hasRefreshedForPayment.current = true;
          refresh();
        }

        // Clean up URL parameter immediately
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("paymentSubmitted");
        window.history.replaceState({}, '', newUrl.toString());
      }
    }
  }, [status, userEmail, user, userLoading, error, refresh, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!userEmail) return;
    if (userLoading) return;
    if (!user) return;

    // Skip all payment checks for OFFICIAL users
    if (user.status === 'OFFICIAL') return;

    // Check if we just submitted a payment - skip auto-redirects until the
    // stored `skipPaymentRedirectUntil` timestamp (set by the payment page).
    if (typeof window !== 'undefined') {
      const skipUntilStr = sessionStorage.getItem('skipPaymentRedirectUntil');
      if (skipUntilStr) {
        const skipUntil = parseInt(skipUntilStr, 10);
        if (!isNaN(skipUntil) && Date.now() < skipUntil) {
          console.log('[Dashboard] Payment recently submitted, skipping auto-redirects');
          return;
        }
        // expired - remove
        try { sessionStorage.removeItem('skipPaymentRedirectUntil'); } catch (e) { /* noop */ }
      }
    }

    // Check initial payment first
    const initialPaymentStatus = user.initialPayment?.status;
    if (!initialPaymentStatus || initialPaymentStatus === "REJECTED") {
      console.log('[Dashboard] Redirecting to initial payment, status:', initialPaymentStatus || 'none');
      router.push(`/payments/initial?email=${encodeURIComponent(userEmail)}`);
      return;
    }

    // For INTERVIEW_PASSED users we do not auto-redirect to the final payment
    // page anymore. The `DashboardLayout` shows a banner with a link to
    // `/payments/final` so the user can choose when to pay. This avoids
    // surprising redirects when a user lands on the dashboard.
    // (No-op)

    console.log('[Dashboard] User has valid payments, staying on dashboard');
  }, [router, status, user, userEmail, userLoading]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!userEmail) return;
      setPendingTasksLoading(true);
      try {
        const res = await fetch('/api/tasks');
        if (!res.ok) {
          setPendingTasks([]);
          return;
        }
        const d = await res.json();
        if (!mounted) return;
        setPendingTasks(d.tasks || []);
      } catch (e) {
        if (!mounted) return;
        setPendingTasks([]);
      } finally {
        if (mounted) setPendingTasksLoading(false);
      }
    })();
    // fetch donation campaigns to keep donations panel consistent with /dashboard/donations
    (async () => {
      if (!userEmail) return;
      setCampaignsLoading(true);
      try {
        const r = await fetch('/api/donations');
        if (!r.ok) {
          setCampaigns([]);
          return;
        }
        const j = await r.json();
        if (!mounted) return;
        setCampaigns(j.donations || []);
      } catch (e) {
        if (!mounted) return;
        setCampaigns([]);
      } finally {
        if (mounted) setCampaignsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userEmail]);

  // Compute pending and available coins from withdrawals
  const totalCoins = Number(user?.coins ?? 0);
  const pendingCoins = (withdrawals || []).filter((w: any) => w.status === 'PENDING').reduce((s: number, w: any) => s + (w?.coins || 0), 0);
  const availableCoins = Math.max(0, totalCoins - pendingCoins);

  // Keep submission status in sync for the tasks shown on the dashboard
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pendingTasks || pendingTasks.length === 0) {
        setTaskSubmissionMap({});
        return;
      }
      const ids = pendingTasks.map((t) => t.id).filter(Boolean);
      if (!ids.length) {
        setTaskSubmissionMap({});
        return;
      }
      try {
        const res = await fetch(`/api/tasks/submissions?taskIds=${ids.join(',')}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setTaskSubmissionMap(data.submissions || {});
        }
      } catch (e) {
        if (!cancelled) setTaskSubmissionMap({});
      }
    })();
    return () => { cancelled = true; };
  }, [pendingTasks]);

  // Fetch withdrawal history
  useEffect(() => {
    if (!userEmail) return;
    let cancelled = false;
    (async () => {
      setWithdrawalsLoading(true);
      try {
        const res = await fetch('/api/coins/request-withdrawal');
        if (!res.ok) {
          if (!cancelled) setWithdrawals([]);
          return;
        }
        const data = await res.json();
        if (!cancelled) setWithdrawals(data.withdrawals || []);
      } catch (e) {
        if (!cancelled) setWithdrawals([]);
      } finally {
        if (!cancelled) setWithdrawalsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userEmail]);

  // Fetch points history & rank data on demand (once per session)
  const fetchPointsData = async () => {
    if (pointsDataFetched.current) return;
    pointsDataFetched.current = true;
    setPointsDataLoading(true);
    try {
      const res = await fetch('/api/user/points-history');
      if (!res.ok) { setPointsData(null); return; }
      const data = await res.json();
      setPointsData(data);
    } catch (e) {
      setPointsData(null);
    } finally {
      setPointsDataLoading(false);
    }
  };

  const openPointsModal = () => { fetchPointsData(); setShowPointsModal(true); };
  const openRankModal  = () => { fetchPointsData(); setShowRankModal(true);  };

  const handleWithdrawRequest = async () => {
    if (!withdrawCoins || withdrawCoins <= 0) {
      alert('Please enter a valid coin amount');
      return;
    }
    if (withdrawCoins < 15000) {
      alert('Minimum 15000 coins required for withdrawal');
      return;
    }
    if (!withdrawAccount) {
      alert('Please enter your payment account number');
      return;
    }

    setWithdrawSubmitting(true);
    try {
      const res = await fetch('/api/coins/request-withdrawal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          coins: Number(withdrawCoins),
          paymentMethod: withdrawMethod,
          accountNumber: withdrawAccount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      
      alert('Withdrawal request submitted successfully!');
      setShowWithdrawModal(false);
      setShowCoinModal(true); // Reopen coin modal to show updated status
      setWithdrawCoins('');
      setWithdrawAccount('');

      // Optimistically add the new pending withdrawal so UI updates immediately
      if (data?.withdrawal) {
        setWithdrawals((prev) => [data.withdrawal, ...(prev || [])]);
      }

      // Refresh server state in background
      try {
        const refreshRes = await fetch('/api/coins/request-withdrawal');
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setWithdrawals(refreshData.withdrawals || []);
        }
      } catch (e) {
        // ignore
      }
      refresh();
    } catch (e: any) {
      alert(e?.message || 'Failed to submit withdrawal request');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  // If the session is unauthenticated, allow rendering when we have a stored
  // `userEmail` (email-verify -> payment flow). Otherwise return null to avoid
  // showing dashboard to unauthenticated visitors.
  if (status === "unauthenticated" && !userEmail) {
    return null;
  }

  const isLoading = userLoading || status === "loading";

  const displayUserName = user?.fullName || user?.username || session?.user?.name || "User";
  const displayEmail = user?.email || session?.user?.email || "";
  // Prioritize session role (fetched at login) over cached user role to avoid flicker
  const sessionRole = (session as any)?.user?.role;
  const displayRole = (sessionRole as "VOLUNTEER" | "HR" | "MASTER" | "ADMIN" | "DIRECTOR" | "DATABASE_DEPT" | "SECRETARIES") || (user?.role as "VOLUNTEER" | "HR" | "MASTER" | "ADMIN" | "DIRECTOR" | "DATABASE_DEPT" | "SECRETARIES") || "VOLUNTEER";

  const skeletonPanel = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
      {[1, 2, 3].map((item) => (
        <div key={item} className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
          <div className="h-4 w-28 bg-gray-200 rounded" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-5/6 bg-gray-200 rounded" />
            <div className="h-4 w-2/3 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  const skeletonPage = (
    <div className="max-w-6xl mx-auto px-3.5 py-5 sm:px-5 sm:py-6 space-y-8">
      <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gray-200 rounded-md" />
            <div className="space-y-2">
              <div className="h-4 w-40 bg-gray-200 rounded" />
              <div className="h-4 w-28 bg-gray-200 rounded" />
              <div className="h-3 w-24 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-24 bg-gray-200 rounded-full" />
            <div className="h-8 w-28 bg-gray-200 rounded-full" />
          </div>
        </div>
      </div>
      {skeletonPanel}
    </div>
  );

  if (!user && !isLoading) {
    return null;
  }

  const experiencePanel = (
    <aside className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 h-full">
      <div className="bg-white rounded-md border border-gray-100 p-3.5 h-full flex flex-col">
        <h3 className="text-sm font-medium text-gray-800 mb-3">Experience & Roles</h3>
        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {user?.experiences?.length ? (
            user.experiences.map((exp) => (
              <div key={exp.id} className="flex items-start gap-3">
                <div className="mt-1 text-gray-500">💼</div>
                <div className="text-sm text-gray-700">
                  <div className="font-medium text-gray-900">{exp.title}</div>
                  <div className="text-xs text-gray-600">{exp.organization || 'N/A'}</div>
                  <div className="text-xs text-gray-500">{formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-600">No experience added yet.</div>
          )}
        </div>
      </div>
    </aside>
  );

  const tasksPanel = (
    <section className="bg-gray-50 border border-gray-200 rounded-lg p-3.5">
      <h3 className="text-sm font-medium text-[#0b2545] mb-4">Pending Tasks</h3>
      <div className="space-y-3">
        {pendingTasksLoading ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : (
          (() => {
            const submissionByTaskId = new Map<string, any>();

            // Prefer fresh submission map from API, fall back to cached profile data
            (user?.taskSubmissions || []).forEach((s) => {
              const taskId = s.task?.id;
              if (taskId) submissionByTaskId.set(taskId, s);
            });

            Object.entries(taskSubmissionMap || {}).forEach(([taskId, submission]) => {
              if (!submissionByTaskId.has(taskId)) {
                submissionByTaskId.set(taskId, {
                  ...submission,
                  task: (pendingTasks || []).find((t) => t.id === taskId) || null,
                });
              }
            });

            const submittedPending = Array.from(submissionByTaskId.values()).filter((s: any) => s?.status === 'PENDING');
            const visiblePending = (pendingTasks || []).filter((t) => !submissionByTaskId.has(t.id));

            if (!visiblePending.length && !submittedPending.length) {
              return <div className="text-sm text-gray-600">No pending tasks.</div>;
            }

            return (
              <div className="space-y-3">
                {visiblePending.slice(0, 6).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => router.push('/dashboard/tasks')}
                    className="bg-white border border-gray-100 rounded-lg p-3.5 flex flex-col gap-1 cursor-pointer hover:shadow-sm hover:translate-y-[-1px] transition-transform"
                  >
                    <div className="flex items-center justify-between text-sm text-gray-800">
                      <span className="font-medium text-slate-900 truncate pr-2">{t.title || 'Task'}</span>
                      <span className="text-xs text-gray-500">{t.endDate ? formatDhakaDate(t.endDate) : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-600 flex-wrap">
                      <span className="font-semibold text-amber-700">+{t.pointsPositive ?? 0} pts</span>
                      {t.mandatory ? <span className="text-red-600 font-semibold">Mandatory</span> : null}
                      <span className="uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold tracking-wide">{t.taskType || 'TASK'}</span>
                    </div>
                  </div>
                ))}

                {submittedPending.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="text-xs text-slate-500 mb-2 font-medium">Submitted (Pending Review)</div>
                    <div className="space-y-2">
                      {submittedPending.slice(0, 6).map((s) => (
                        <div key={s.id} className="bg-white border border-gray-100 rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <div className="text-sm text-gray-800">{s.task?.title || 'Task'}</div>
                            <div className="text-xs text-gray-500">Submitted: {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : '—'}</div>
                          </div>
                          <div className="text-xs text-amber-700 font-semibold">Pending Review</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>
    </section>
  );

  const donationsPanel = (
    <aside className="bg-gray-50 border border-gray-200 rounded-lg p-3.5">
      <h3 className="text-sm font-medium text-[#0b2545] mb-4">Pending Donations</h3>
      <div className="space-y-4">
        {campaignsLoading ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : (campaigns && campaigns.length ? (
          campaigns.slice(0,6).map((d:any) => (
            <div key={d.id || d.purpose} className="bg-white border border-gray-100 rounded-lg p-3.5 cursor-pointer hover:shadow-sm">
              <div className="flex items-center justify-between">
                <div className="pr-3 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{d.purpose || d.title || 'Campaign'}</div>
                  <div className="text-xs text-gray-500">{d.bkashNumber || ''} {d.nagadNumber ? ` • ${d.nagadNumber}` : ''}</div>
                </div>
                <div className="text-sm text-gray-800 text-right">
                  <div>৳{d.amountTarget?.toLocaleString?.() ?? 0}</div>
                  {d.amountCollected ? <div className="text-[11px] text-slate-500">Raised ৳{d.amountCollected?.toLocaleString?.()}</div> : null}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-600 flex-wrap">
                {d.status ? <span className="uppercase bg-slate-100 px-2 py-0.5 rounded-full font-semibold tracking-wide">{d.status}</span> : null}
                {d.deadline ? <span className="text-slate-500">Due {formatDhakaDate(d.deadline)}</span> : null}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border border-slate-100 rounded-lg p-6 text-center">
            <div className="text-sm text-gray-600">No active campaigns.</div>
          </div>
        ))}
      </div>
    </aside>
  );

  const mobileTabs: { key: TabKey; label: string }[] = [
    { key: 'experience', label: 'Experience' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'donations', label: 'Donations' },
  ];

  return (
    <DashboardLayout
      userRole={displayRole}
      userName={displayUserName}
      userEmail={displayEmail}
      userId={user?.id || ""}
      initialUserStatus={user?.status}
      initialFinalPaymentStatus={user?.finalPayment?.status}
      initialInitialPaymentStatus={user?.initialPayment?.status}
    >
      {isLoading || !user ? (
        skeletonPage
      ) : (
        <div className="max-w-6xl mx-auto px-3.5 py-5 sm:px-5 sm:py-6 lg:px-6">
          {/* Top Profile Header */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-50 border border-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                  {user.profilePicUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.profilePicUrl} alt={user.fullName || 'Avatar'} className="w-full h-full object-cover" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5a8.25 8.25 0 0115 0" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-semibold text-gray-900">{user.fullName || user.username || "Volunteer"}</div>
                  </div>
                  <div className="text-sm text-gray-600">{user.institute?.name || "Independent"}</div>
                  <div className="text-xs text-gray-500">ID: {user.volunteerId || "—"}</div>
                  <div className="text-xs text-gray-500 mt-1">{user.followersCount ?? 0} followers · {user.followingCount ?? 0} following</div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={openRankModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-100 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 flex-shrink-0">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                  </svg>
                  {user.volunteerProfile?.rank ?? '—'}
                </button>
                <button
                  onClick={openPointsModal}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-gradient-to-r from-[#0b2545] to-[#07223f] text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  {user.volunteerProfile?.points ?? 0} Points
                </button>
                <button
                  onClick={() => setShowCoinModal(true)}
                  className="inline-flex items-center px-3 py-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-medium hover:from-amber-600 hover:to-amber-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <Image src="/icons/coin.svg" alt="coin" width={20} height={20} className="mr-1.5 flex-shrink-0 drop-shadow-sm" />
                  {user.coins ?? 0} Coins
                </button>
              </div>
            </div>
          </div>

          {/* Service / Sectors / Clubs tags - placed just below profile header (visible like mobile switch buttons) */}
          {(user.status === 'OFFICIAL' || user.volunteerProfile?.isOfficial) && (
            <div className="mb-6 mt-2">
              <div className="flex flex-wrap gap-2">
                {user.volunteerProfile?.service ? (
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-800">{user.volunteerProfile.service?.name}</span>
                ) : null}

                {(user.volunteerProfile?.sectors || []).length > 0 ? (
                  (user.volunteerProfile?.sectors || []).map(s => (
                    <span key={`sector-${s}`} className="px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-800">{s}</span>
                  ))
                ) : null}

                {(user.volunteerProfile?.clubs || []).length > 0 ? (
                  (user.volunteerProfile?.clubs || []).map(c => (
                    <span key={`club-${c}`} className="px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-800">{c}</span>
                  ))
                ) : null}

                {(!user.volunteerProfile?.service && !(user.volunteerProfile?.sectors || []).length && !(user.volunteerProfile?.clubs || []).length) && (
                  <span className="text-xs text-gray-500">—</span>
                )}
              </div>
            </div>
          )}

          <div className="md:hidden mb-6">
            <div className="flex gap-2 mb-4">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`px-4 py-2 rounded-full text-sm border ${activeTab === tab.key ? 'bg-[#0b2545] text-white border-[#0b2545]' : 'bg-white text-gray-700 border-gray-200'}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              {activeTab === 'experience' && experiencePanel}
              {activeTab === 'tasks' && tasksPanel}
              {activeTab === 'donations' && donationsPanel}
            </div>
          </div>

          {/* 3-column content area */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-5">
            {experiencePanel}
            {tasksPanel}
            {donationsPanel}
          </div>
        </div>
      )}

      {/* Withdrawal Request Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Request Withdrawal</h2>
                <button onClick={() => setShowWithdrawModal(false)} className="p-2 hover:bg-white rounded-lg transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Coins to Withdraw
                  <span className="ml-2 text-xs font-normal text-gray-500">(min: 15000 coins)</span>
                </label>
                <input
                  type="number"
                  value={withdrawCoins}
                  onChange={(e) => setWithdrawCoins(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter amount"
                  min="15000"
                  max={user?.coins ?? 0}
                />
                {withdrawCoins && (
                  <div className="mt-1 text-sm text-gray-600">Get an amount</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
                <select
                  value={withdrawMethod}
                  onChange={(e) => setWithdrawMethod(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Account Number</label>
                <input
                  type="text"
                  value={withdrawAccount}
                  onChange={(e) => setWithdrawAccount(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter your account number"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleWithdrawRequest}
                  disabled={withdrawSubmitting}
                  className="flex-1 px-4 py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {withdrawSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  disabled={withdrawSubmitting}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coin Details Modal */}
      {showCoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[600px] overflow-auto">
            <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image src="/icons/coin.svg" alt="coin" width={36} height={36} className="drop-shadow-md" />
                  <h2 className="text-xl font-bold text-gray-900">Your Coins</h2>
                </div>
                <button onClick={() => setShowCoinModal(false)} className="p-2 hover:bg-white rounded-lg transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Coin Balance Display */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 text-center">
                <div className="text-sm text-gray-600 mb-2">Current Balance</div>
                <div className="text-4xl font-bold text-amber-600 mb-2">{totalCoins} Coins</div>
                <div className="mt-1 text-sm text-gray-600">Pending: {pendingCoins} • Available: {availableCoins}</div>
                <div className="mt-2 text-xs text-gray-500">Minimum 15000 coins to withdraw</div>
              </div>

              {/* Withdrawal Button */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCoinModal(false);
                    setShowWithdrawModal(true);
                  }}
                  disabled={(user?.coins ?? 0) < 15000}
                  className="w-full px-6 py-3 bg-amber-600 text-white text-base font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
                >
                  {(user?.coins ?? 0) < 15000 ? 'Need 15000+ Coins to Withdraw' : 'Request Withdrawal'}
                </button>
                {withdrawals.filter(w => w.status === 'PENDING').length > 0 && (
                  <div className="mt-3 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                    <span className="text-sm text-yellow-800 font-medium">
                      {withdrawals.filter(w => w.status === 'PENDING').length} Pending Request(s)
                    </span>
                  </div>
                )}
              </div>

              {/* Recent Withdrawals */}
              {withdrawals.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Withdrawal History</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {withdrawals.map((w: any) => (
                      <div key={w.id} className={`p-3 rounded-lg border ${w.status === 'PENDING' ? 'bg-yellow-50 border-yellow-200' : w.status === 'COMPLETED' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="font-semibold text-sm">{w.coins} coins</span>
                            
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${w.status === 'PENDING' ? 'bg-yellow-200 text-yellow-800' : w.status === 'COMPLETED' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                            {w.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(w.createdAt).toLocaleDateString()} • {w.paymentMethod?.toUpperCase()}
                        </div>
                        {w.notes && w.status === 'REJECTED' && (
                          <div className="text-xs text-red-600 mt-1 italic">Reason: {w.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Points History Modal ───────────────────────────────────────── */}
      {showPointsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[600px] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#0b2545] to-[#07223f] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-white">Points History</h2>
              </div>
              <button onClick={() => setShowPointsModal(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>

            {/* Summary strip */}
            <div className="px-6 py-3 bg-[#0b2545]/5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <span className="text-sm text-gray-600">Total Points</span>
              <span className="text-xl font-bold text-[#0b2545]">{user?.volunteerProfile?.points ?? 0}</span>
            </div>

            {/* History list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {pointsDataLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 border-2 border-[#0b2545] border-t-transparent rounded-full animate-spin"/>
                  <span className="text-sm text-gray-500">Loading history…</span>
                </div>
              ) : !pointsData || pointsData.history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <p className="text-sm text-gray-500">No points history yet.</p>
                  <p className="text-xs text-gray-400">Complete tasks or make donations to earn points!</p>
                </div>
              ) : (
                pointsData.history.map((entry) => {
                  const isPositive = entry.change >= 0;
                  const date = new Date(entry.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' });
                  const label = entry.relatedTask?.title
                    ? entry.relatedTask.title
                    : entry.relatedDonation
                    ? `Donation • ৳${entry.relatedDonation.amount}`
                    : entry.reason;
                  return (
                    <div key={entry.id} className="flex items-start gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors">
                      <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {isPositive ? '+' : '−'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{date}</div>
                      </div>
                      <div className={`flex-shrink-0 text-sm font-bold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}{entry.change}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Rank Status Modal ──────────────────────────────────────────── */}
      {showRankModal && (() => {
        const cp       = pointsData?.currentPoints ?? user?.volunteerProfile?.points ?? 0;
        const threshold = pointsData?.currentRankThreshold ?? 0;
        const nextRank  = pointsData?.nextRankName ?? null;
        const nextThreshold = pointsData?.nextRankThreshold ?? null;
        const progressPct = threshold > 0 ? Math.min(100, Math.round((cp / threshold) * 100)) : (nextRank ? 0 : 100);
        const rankSeq = pointsData?.rankSequence ?? [];
        const currentRankName = pointsData?.currentRankName ?? user?.volunteerProfile?.rank ?? null;

        const inspiringMessage = (() => {
          if (!nextRank)           return "You've reached the pinnacle of leadership. Your journey is an inspiration to every volunteer in the community!";
          if (progressPct >= 100)  return "You've hit the threshold — a new rank is on its way! Your incredible effort is about to be rewarded.";
          if (progressPct >= 90)   return "Almost there! One final push and you'll claim your next rank. The community is cheering for you!";
          if (progressPct >= 75)   return "You're in the home stretch! Your unwavering dedication is setting an example for everyone around you.";
          if (progressPct >= 55)   return "Over halfway! Your commitment to the community is making a real, lasting difference.";
          if (progressPct >= 35)   return "Great momentum! Every task you complete inches you closer to greatness.";
          if (progressPct >= 15)   return "You're building something real. Keep showing up — the community grows stronger with every contribution you make.";
          return "Every great journey starts with a single step. Your dedication, no matter how small, lights the way for others.";
        })();

        // Rank ladder: show current ±3 ranks in context
        const currentSeqIdx = rankSeq.findIndex(r => r.name.trim().toLowerCase() === (currentRankName ?? '').trim().toLowerCase());

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[640px] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-[#0b2545] to-[#07223f] flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-white">Rank Status</h2>
                </div>
                <button onClick={() => setShowRankModal(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-5">
                  {pointsDataLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="w-8 h-8 border-2 border-[#0b2545] border-t-transparent rounded-full animate-spin"/>
                      <span className="text-sm text-gray-500">Loading rank data…</span>
                    </div>
                  ) : (
                    <>
                      {/* Current rank badge */}
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0b2545] text-white rounded-full text-sm font-semibold shadow-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="currentColor" stroke="none">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                          {currentRankName ?? 'VOLUNTEER'}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Progress to next rank</span>
                          <span className="text-xs font-bold text-[#0b2545]">{progressPct}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-3 rounded-full transition-all duration-700"
                            style={{
                              width: `${progressPct}%`,
                              background: progressPct >= 100
                                ? 'linear-gradient(90deg, #059669, #10b981)'
                                : progressPct >= 75
                                ? 'linear-gradient(90deg, #1e40af, #3b82f6)'
                                : 'linear-gradient(90deg, #0b2545, #1e4d8c)',
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">{cp} pts earned</span>
                          {nextRank ? (
                            <span className="text-xs text-gray-500">{threshold} pts needed → <span className="font-medium text-gray-700">{nextRank}</span></span>
                          ) : (
                            <span className="text-xs font-medium text-emerald-600">Top rank achieved 🎉</span>
                          )}
                        </div>
                      </div>

                      {/* Inspiring message */}
                      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 mt-0.5 flex-shrink-0">
                          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                        </svg>
                        <p className="text-sm text-blue-800 leading-relaxed italic">{inspiringMessage}</p>
                      </div>

                      {/* Rank ladder */}
                      {rankSeq.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Rank Progression</h4>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {rankSeq.map((r, idx) => {
                              const isCompleted = currentSeqIdx >= 0 && idx < currentSeqIdx;
                              const isCurrent   = idx === currentSeqIdx;
                              const isNext      = idx === currentSeqIdx + 1;
                              return (
                                <div
                                  key={r.name}
                                  className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                                    isCurrent
                                      ? 'bg-[#0b2545] text-white'
                                      : isCompleted
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : isNext
                                      ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                      : 'text-gray-400'
                                  }`}
                                >
                                  <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    isCurrent ? 'bg-white/20 text-white' : isCompleted ? 'bg-emerald-200 text-emerald-700' : 'bg-gray-100 text-gray-400'
                                  }`}>
                                    {isCompleted ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"/>
                                      </svg>
                                    ) : (
                                      idx + 1
                                    )}
                                  </div>
                                  <span className={`flex-1 text-xs font-medium`}>{r.name}</span>
                                  {isCurrent && <span className="text-[10px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">Current</span>}
                                  {isNext && <span className="text-[10px] font-semibold text-blue-600">{r.thresholdPoints} pts</span>}
                                  {!isCurrent && !isNext && !isCompleted && (
                                    <span className="text-[10px] text-gray-300">{r.thresholdPoints} pts</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </DashboardLayout>
  );
}

