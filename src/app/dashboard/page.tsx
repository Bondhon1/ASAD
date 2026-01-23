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
  volunteerProfile: { points: number; isOfficial?: boolean; rank?: string | null; service?: string | null; sectors?: string[]; clubs?: string[] } | null;
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
  const startText = start ? new Date(start).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '';
  const endText = isCurrent ? 'Present' : end ? new Date(end).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '';
  if (startText && endText) return `${startText} – ${endText}`;
  if (startText) return `Started ${startText}`;
  return endText || '';
};

type TabKey = "experience" | "tasks" | "donations";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<TabKey>("experience");
  const userEmail = session?.user?.email || (typeof window !== "undefined" ? localStorage.getItem("userEmail") : null);
  const { user, loading: userLoading, error, refresh } = useCachedUserProfile<User>(userEmail);

  useEffect(() => {
    if (status === "unauthenticated") {
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

    // Prioritize actual payment status from database over JWT needsPayment flag
    const paymentStatus = user?.initialPayment?.status;
    
    // If user has a payment record that is not rejected, stay on dashboard
    if (paymentStatus && paymentStatus !== "REJECTED") return;

    // Only redirect if we've confirmed no valid payment exists
    if (user && (!paymentStatus || paymentStatus === "REJECTED")) {
      router.push(`/payments/initial?email=${encodeURIComponent(userEmail)}`);
    }
  }, [router, status, user, userEmail, userLoading]);

  if (status === "unauthenticated") {
    return null;
  }

  const isLoading = userLoading || status === "loading";

  const displayUserName = user?.fullName || user?.username || session?.user?.name || "User";
  const displayEmail = user?.email || session?.user?.email || "";
  // Prioritize session role (fetched at login) over cached user role to avoid flicker
  const sessionRole = (session as any)?.user?.role;
  const displayRole = (sessionRole as "VOLUNTEER" | "HR" | "MASTER" | "ADMIN" | "DATABASE_DEPT" | "SECRETARIES") || (user?.role as "VOLUNTEER" | "HR" | "MASTER" | "ADMIN" | "DATABASE_DEPT" | "SECRETARIES") || "VOLUNTEER";

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
        {user?.taskSubmissions?.length ? (
          user.taskSubmissions
            .filter(ts => ts.status === 'PENDING')
            .slice(0, 6)
            .map((ts) => (
              <div key={ts.id} className="bg-white border border-gray-100 rounded-lg p-4 h-16 flex items-center justify-between cursor-pointer hover:shadow-sm hover:translate-y-[-1px] transition-transform">
                <div className="text-sm text-gray-800">{ts.task?.title || 'Task'}</div>
                <div className="text-xs text-gray-500">{new Date(ts.submittedAt).toLocaleDateString()}</div>
              </div>
            ))
        ) : (
          <div className="text-sm text-gray-600">No pending tasks.</div>
        )}
      </div>
    </section>
  );

  const donationsPanel = (
    <aside className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-[#0b2545] mb-4">Pending Donations</h3>
      <div className="space-y-4">
        {user?.donations?.some(d => d.status === 'PENDING') ? (
          user.donations.filter(d => d.status === 'PENDING').slice(0, 6).map(d => (
            <div key={d.id} className="bg-white border border-gray-100 rounded-lg p-4 cursor-pointer hover:shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{d.trxId || 'Donation'}</div>
                  <div className="text-xs text-gray-500">{d.paymentMethod || ''} · {new Date(d.donatedAt).toLocaleDateString()}</div>
                </div>
                <div className="text-sm text-gray-800">৳{d.amount.toFixed(2)}</div>
              </div>
            </div>
          ))
        ) : (
          <>
            <div className="bg-white border border-gray-100 rounded-lg p-6 cursor-pointer hover:bg-gradient-to-r hover:from-[#0b2545]/5 hover:to-white">
              <div className="text-base font-semibold text-[#07223f]">Monthly Donations</div>
              <div className="text-sm text-gray-500">Manage recurring donors and pledges</div>
            </div>
            <div className="bg-white border border-gray-100 rounded-lg p-6 cursor-pointer hover:bg-gradient-to-r hover:from-[#0b2545]/5 hover:to-white">
              <div className="text-base font-semibold text-[#07223f]">Event Donations</div>
              <div className="text-sm text-gray-500">Review incoming event donations</div>
            </div>
          </>
        )}
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

