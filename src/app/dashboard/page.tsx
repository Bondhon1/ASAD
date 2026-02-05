"use client";

import { useEffect, useState } from "react";
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
  }, [status, userEmail, user, userLoading, error, refresh, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!userEmail) return;
    // Wait for user data to load before making payment redirect decision
    if (userLoading) return;

    // If the user was just redirected here after submitting payment, skip the auto-redirect check
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("paymentSubmitted")) return;
    }

    // Prioritize actual payment status from database over JWT needsPayment flag
    const paymentStatus = user?.initialPayment?.status;

    // If user has a payment record that is not rejected, stay on dashboard
    if (paymentStatus && paymentStatus !== "REJECTED") return;

    // Only redirect if we've confirmed no valid payment exists
    if (user && (!paymentStatus || paymentStatus === "REJECTED")) {
      router.push(`/payments/initial?email=${encodeURIComponent(userEmail)}`);
    }
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
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-8">
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
    <aside className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-full">
      <div className="bg-white rounded-md border border-gray-100 p-4 h-full flex flex-col">
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
    <section className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-[#0b2545] mb-4">Pending Tasks</h3>
      <div className="space-y-3">
        {pendingTasksLoading ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : (
          (() => {
            const submittedPending = (user?.taskSubmissions || []).filter(s => s.status === 'PENDING');
            const visiblePending = (pendingTasks || []).filter(t => !((user?.taskSubmissions || []).some(s => s.task?.id === t.id)));

            if (!visiblePending.length && !submittedPending.length) {
              return <div className="text-sm text-gray-600">No pending tasks.</div>;
            }

            return (
              <div className="space-y-3">
                {visiblePending.slice(0, 6).map((t) => (
                  <div key={t.id} onClick={() => router.push('/dashboard/tasks')} className="bg-white border border-gray-100 rounded-lg p-4 h-16 flex items-center justify-between cursor-pointer hover:shadow-sm hover:translate-y-[-1px] transition-transform">
                    <div className="text-sm text-gray-800">{t.title || 'Task'}</div>
                    <div className="text-xs text-gray-500">{t.endDate ? formatDhakaDate(t.endDate) : ''}</div>
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
    <aside className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-[#0b2545] mb-4">Pending Donations</h3>
      <div className="space-y-4">
        {campaignsLoading ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : (campaigns && campaigns.length ? (
          campaigns.slice(0,6).map((d:any) => (
            <div key={d.id || d.purpose} className="bg-white border border-gray-100 rounded-lg p-4 cursor-pointer hover:shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{d.purpose || d.title || 'Campaign'}</div>
                  <div className="text-xs text-gray-500">{d.bkashNumber || ''} {d.nagadNumber ? ` • ${d.nagadNumber}` : ''}</div>
                </div>
                <div className="text-sm text-gray-800">৳{d.amountTarget?.toLocaleString() ?? 0}</div>
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
    >
      {isLoading || !user ? (
        skeletonPage
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
          {/* Top Profile Header */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
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

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-sm font-medium text-gray-800">{user.volunteerProfile?.rank ?? '—'}</span>
                <span className="inline-flex items-center px-3 py-2 rounded-full bg-gradient-to-r from-[#0b2545] to-[#07223f] text-white text-sm font-medium">Points: {user.volunteerProfile?.points ?? 0}</span>
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
          <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-6">
            {experiencePanel}
            {tasksPanel}
            {donationsPanel}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

