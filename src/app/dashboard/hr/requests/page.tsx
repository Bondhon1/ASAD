"use client";

// Prevent double initial fetch caused by React Strict Mode (dev):
// use a short-lived module-level timestamp so remounts within a few
// seconds won't re-run the heavy initial fetch. This avoids duplicate
// API requests while preserving normal navigation behaviour in prod.
let __hrRequestsInitialFetchTs = 0;
// Module-level cache for interview slot availability to avoid duplicate
// network calls within a short window (dev strict-mode remounts, or
// multiple callers in the same render cycle).
let __hrInterviewSlotsCache: { hasAvailableSlots: boolean } | null = null;
let __hrInterviewSlotsCacheTs = 0;
let __hrInterviewSlotsCachedPromise: Promise<{ hasAvailableSlots: boolean }> | null = null;

const getAvailableSlots = async (): Promise<{ hasAvailableSlots: boolean }> => {
  const now = Date.now();
  // Use cached value for 5s
  if (__hrInterviewSlotsCache && now - __hrInterviewSlotsCacheTs < 5000) {
    return __hrInterviewSlotsCache;
  }

  if (__hrInterviewSlotsCachedPromise) return __hrInterviewSlotsCachedPromise;

  __hrInterviewSlotsCachedPromise = (async () => {
    try {
      const slotsResponse = await fetch("/api/hr/interview-slots/available");
      const slotsData = await slotsResponse.json();
      const value = { hasAvailableSlots: !!slotsData.hasAvailableSlots };
      __hrInterviewSlotsCache = value;
      __hrInterviewSlotsCacheTs = Date.now();
      return value;
    } finally {
      // clear pending promise so subsequent callers can refresh after it resolves
      __hrInterviewSlotsCachedPromise = null;
    }
  })();

  return __hrInterviewSlotsCachedPromise;
};
import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Calendar, Eye, AlertTriangle, BarChart3 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";
import { useModal } from '@/components/ui/ModalProvider';

interface Application {
  id: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    institute: { name: string } | null;
    joiningSemester: string;
    initialPayment?: any | null;
  };
  trxId: string;
  paymentMethod: string;
  status: string;
  appliedAt: string;
}

interface CAStats {
  id: string;
  groupName: string;
  caCode: string;
  teamLeader: string;
  usageCount: number;
  users: Array<{
    id: string;
    fullName: string | null;
    email: string;
    volunteerId: string | null;
    createdAt: string;
  }>;
}

export default function NewRequestsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const email = useMemo(() => session?.user?.email || (typeof window !== "undefined" ? window.localStorage.getItem("userEmail") : null), [session?.user?.email]);
  const { user, loading: userCacheLoading, refresh: refreshUser, setUser } = useCachedUserProfile(email);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [hasAvailableSlots, setHasAvailableSlots] = useState(true);
  const [showCAStats, setShowCAStats] = useState(false);
  const [caStats, setCAStats] = useState<CAStats[]>([]);
  const [caStatsLoading, setCAStatsLoading] = useState(false);
  const [caPage, setCAPage] = useState(1);
  const [caPageSize, setCAPageSize] = useState(20);
  const [caTotal, setCATotal] = useState(0);
  const [volunteerStats, setVolunteerStats] = useState<Array<{ id: string; fullName: string; email: string; volunteerId: string | null; usageCount: number }>>([]);
  const [volunteerTotal, setVolunteerTotal] = useState(0);
  const [volunteerPage, setVolunteerPage] = useState(1);
  const [volunteerPageSize, setVolunteerPageSize] = useState(20);
  const [caSearchFilter, setCASearchFilter] = useState("");
  const [caDateFilter, setCADateFilter] = useState({ startDate: "", endDate: "" });

  const isLoading = loading || status === "loading";
  const skeletonTable = (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 animate-pulse">
      <div className="p-6 space-y-4">
        <div className="h-5 w-48 bg-gray-200 rounded" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 w-full bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
  const displayName = user?.fullName || user?.username || session?.user?.name || "HR";
  const displayEmail = user?.email || session?.user?.email || "";
  const sessionRole = (session as any)?.user?.role;
  const displayRole = sessionRole || (user?.role as "VOLUNTEER" | "HR" | "MASTER" | "ADMIN" | "DIRECTOR" | "DATABASE_DEPT" | "SECRETARIES") || "HR";
  const { alert, prompt } = useModal();
  
  // Track if initial fetch has been done
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    // Check authentication and fetch user
    const fetchUserAndApplications = async () => {
      if (status === "unauthenticated") {
        router.push("/auth");
        return;
      }

      // Avoid duplicate initial fetches triggered by React strict-mode
      // remounts during development. If a recent initial fetch was
      // started within the last 5s, skip starting another one.
      if (status === "loading" || hasFetched) return;
      if (Date.now() - __hrRequestsInitialFetchTs < 5000) {
        setHasFetched(true);
        setLoading(false);
        return;
      }

      if (!email) {
        router.push("/auth");
        return;
      }

      // Use session role for quick authorization without waiting for slow user profile
      const role = sessionRole || user?.role;
      if (sessionRole && sessionRole !== "HR" && sessionRole !== "MASTER" && sessionRole !== "ADMIN") {
        router.push("/dashboard");
        return;
      }

      // If we don't have role yet, wait for session or user
      if (!role) return;

      try {
        // Mark as fetched to prevent re-fetching and record timestamp
        setHasFetched(true);
        __hrRequestsInitialFetchTs = Date.now();

        // Fetch applications
        const response = await fetch("/api/hr/applications?status=INTERVIEW_REQUESTED");
        const data = await response.json();
        setApplications(data.applications || []);

        // Check slot availability (use cached helper to avoid duplicates)
        try {
          const slots = await getAvailableSlots();
          setHasAvailableSlots(!!slots.hasAvailableSlots);
        } catch (e) {
          // ignore slot errors
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndApplications();
  }, [router, status, email, hasFetched]);

  const fetchApplications = async () => {
    try {
      const response = await fetch("/api/hr/applications?status=INTERVIEW_REQUESTED");
      const data = await response.json();
      setApplications(data.applications || []);
      
      // Refresh slot availability
      try {
        const slots = await getAvailableSlots();
        setHasAvailableSlots(!!slots.hasAvailableSlots);
      } catch (e) {
        // ignore slot errors
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (applicationId: string) => {
    const reason = await prompt("Please provide a reason for rejection:", 'Rejection Reason');
    if (!reason) return;

    try {
      const response = await fetch(`/api/hr/applications/${applicationId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      
      if (response.ok) {
        await alert("Application rejected.");
        setApplications((prev) => prev.filter((app) => app.id !== applicationId));
        if (selectedApp?.id === applicationId) {
          setSelectedApp(null);
        }
        fetchApplications();
      }
    } catch (error) {
      console.error("Error rejecting application:", error);
    }
  };

  const handleApprove = async (applicationId: string) => {
    if (!hasAvailableSlots) {
      await alert("No interview slots available. Create slots first.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/hr/applications/${applicationId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Approve failed");

      await alert("Application approved.");
      setApplications((prev) => prev.filter((app) => app.id !== applicationId));
      if (selectedApp?.id === applicationId) setSelectedApp(null);

      // Refresh applications and slot availability
      fetchApplications();
      try {
        const slots = await getAvailableSlots();
        setHasAvailableSlots(!!slots.hasAvailableSlots);
      } catch (e) {
        // ignore slot refresh errors
      }
    } catch (error: any) {
      console.error("Error approving application:", error);
      await alert("Approve failed: " + (error?.message || "Unknown"));
    } finally {
      setLoading(false);
    }
  };


  const fetchCAStats = async () => {
    setCAStatsLoading(true);
    try {
      const params = new URLSearchParams();
      if (caSearchFilter) params.set("search", caSearchFilter);
      if (caDateFilter.startDate) params.set("startDate", caDateFilter.startDate);
      if (caDateFilter.endDate) params.set("endDate", caDateFilter.endDate);
      params.set("page", String(caPage));
      params.set("pageSize", String(caPageSize));
      params.set("volunteerPage", String(volunteerPage));
      params.set("volunteerPageSize", String(volunteerPageSize));

      const response = await fetch(`/api/ca-references/stats?${params.toString()}`);
      const data = await response.json();
      setCAStats(data.stats || []);
      setCATotal(data.total || 0);
      setVolunteerStats(data.volunteerStats || []);
      setVolunteerTotal(data.volunteerTotal || 0);
    } catch (error) {
      console.error("Error fetching CA stats:", error);
    } finally {
      setCAStatsLoading(false);
    }
  };

  const handleShowCAStats = async () => {
    setShowCAStats(true);
    setCAPage(1);
    fetchCAStats();
  };

  useEffect(() => {
    if (!showCAStats) return;
    fetchCAStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caPage, caPageSize, volunteerPage, volunteerPageSize]);


  if (status === "unauthenticated") return null;

  return (
    <DashboardLayout
      userRole={displayRole}
      userName={displayName}
      userEmail={displayEmail}
      userId={user?.id || ""}
      initialUserStatus={user?.status}
      initialFinalPaymentStatus={user?.finalPayment?.status}
    >
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">New Volunteer Requests</h1>
        <p className="text-gray-600 mt-2">Review and approve payment submissions</p>
        
        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={handleShowCAStats}
            className="px-4 py-2 bg-[#0b2140] text-white rounded-lg hover:bg-[#1a3456] transition-colors flex items-center gap-2"
          >
            <BarChart3 size={18} />
            View CA Statistics
          </button>
        </div>
        
        {!hasAvailableSlots && (
          <div className="mt-4 p-4 bg-white border border-[#0b2140] rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#0b2140] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[#0b2140]">No Interview Slots Available</h3>
              <p className="text-sm text-[#3b5166] mt-1">
                You need to create interview slots before approving applications. 
                <a href="/dashboard/hr/interviews" className="underline ml-1 font-medium text-[#0b2140]">
                  Create slots now →
                </a>
              </p>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        skeletonTable
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Pending Requests ({applications.length})
              </h2>
            </div>

            {applications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No pending applications</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Institute</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">
                          {app.user.fullName}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{app.user.email}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">{app.user.phone}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {app.user.institute?.name || "N/A"}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          <div>
                            <p className="font-medium">{app.paymentMethod?.toUpperCase() ?? '—'}</p>
                            <p className="text-xs text-gray-500">TRX: {app.trxId}</p>
                            {/* Reference removed from initial payment */}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedApp(app)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleApprove(app.id)}
                              disabled={!hasAvailableSlots}
                              className={`p-2 rounded-lg ${
                                hasAvailableSlots
                                  ? "text-green-600 hover:bg-green-50 cursor-pointer"
                                  : "text-gray-400 bg-gray-100 cursor-not-allowed"
                              }`}
                              title={hasAvailableSlots ? "Approve" : "No slots available"}
                            >
                              <CheckCircle size={18} />
                            </button>
                            <button
                              onClick={() => handleReject(app.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Reject"
                            >
                              <XCircle size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Application Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Full Name</label>
                <p className="text-gray-900">{selectedApp.user.fullName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-gray-900">{selectedApp.user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Phone</label>
                <p className="text-gray-900">{selectedApp.user.phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Institute</label>
                <p className="text-gray-900">{selectedApp.user.institute?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Education Level</label>
                <p className="text-gray-900">{selectedApp.user.joiningSemester}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Payment Method</label>
                <p className="text-gray-900">{selectedApp.paymentMethod?.toUpperCase() ?? '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Transaction ID</label>
                <p className="text-gray-900">{selectedApp.trxId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Applied At</label>
                <p className="text-gray-900">{new Date(selectedApp.appliedAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleApprove(selectedApp.id);
                  setSelectedApp(null);
                }}
                className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                Approve Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CA Statistics Modal */}
      {showCAStats && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-6xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Campus Ambassador Statistics</h3>
              <button
                onClick={() => setShowCAStats(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  value={caSearchFilter}
                  onChange={(e) => setCASearchFilter(e.target.value)}
                  placeholder="Search by CA Code, Group, or Leader..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b2140]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={caDateFilter.startDate}
                  onChange={(e) => setCADateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b2140]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={caDateFilter.endDate}
                  onChange={(e) => setCADateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b2140]"
                />
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => { setCAPage(1); fetchCAStats(); }}
                className="px-4 py-2 bg-[#0b2140] text-white rounded-lg hover:bg-[#1a3456] transition-colors"
              >
                Apply Filters
              </button>
              <button
                onClick={() => {
                  setCASearchFilter("");
                  setCADateFilter({ startDate: "", endDate: "" });
                  setCAPage(1);
                  fetchCAStats();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear Filters
              </button>
            </div>

            {caStatsLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b2140]"></div>
                <p className="text-gray-600 mt-4">Loading statistics...</p>
              </div>
            ) : (
              <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    Showing {Math.min(caTotal, caPageSize)} of {caTotal} CA references • Total usage (on page): {caStats.reduce((sum, stat) => sum + stat.usageCount, 0)}
                  </div>

                {caStats.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No CA references found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">CA Code</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Group Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Team Leader</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Usage Count</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Users</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {caStats.map((stat) => (
                          <tr key={stat.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{stat.caCode}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{stat.groupName}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{stat.teamLeader}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                stat.usageCount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {stat.usageCount}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {stat.usageCount > 0 ? (
                                <details className="cursor-pointer">
                                  <summary className="text-[#0b2140] hover:underline">
                                    View {stat.usageCount} user{stat.usageCount !== 1 ? 's' : ''}
                                  </summary>
                                  <div className="mt-2 pl-4 space-y-2">
                                    {stat.users.map((user) => (
                                      <div key={user.id} className="text-xs py-1 border-l-2 border-gray-300 pl-2">
                                        <div className="font-medium">{user.fullName || 'N/A'}</div>
                                        <div className="text-gray-500">{user.email}</div>
                                        {user.volunteerId && (
                                          <div className="text-gray-500">ID: {user.volunteerId}</div>
                                        )}
                                        <div className="text-gray-400 text-xs">
                                          {new Date(user.createdAt).toLocaleDateString()}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              ) : (
                                <span className="text-gray-400">No users</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  )}
                  {/* Volunteer Referrers */}
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Volunteer Referrers</h4>
                    {volunteerStats.length === 0 ? (
                      <div className="text-sm text-gray-500">No volunteer referrers found for the selected filters.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border border-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Volunteer ID</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Usage Count</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {volunteerStats.map((v) => (
                              <tr key={v.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{v.volunteerId || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{v.fullName}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{v.email}</td>
                                <td className="px-4 py-3"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{v.usageCount}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {/* Volunteer pagination */}
                    {volunteerTotal > volunteerPageSize && (
                      <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                          onClick={() => setVolunteerPage((p) => Math.max(1, p - 1))}
                          disabled={volunteerPage === 1}
                          className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                        >
                          Prev
                        </button>
                        <div className="text-sm text-gray-600">Page {volunteerPage} of {Math.ceil(volunteerTotal / volunteerPageSize)}</div>
                        <button
                          onClick={() => setVolunteerPage((p) => (p * volunteerPageSize < volunteerTotal ? p + 1 : p))}
                          disabled={volunteerPage * volunteerPageSize >= volunteerTotal}
                          className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                {/* Pagination Controls */}
                {caTotal > caPageSize && (
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setCAPage((p) => Math.max(1, p - 1))}
                      disabled={caPage === 1}
                      className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <div className="text-sm text-gray-600">Page {caPage} of {Math.ceil(caTotal / caPageSize)}</div>
                    <button
                      onClick={() => setCAPage((p) => (p * caPageSize < caTotal ? p + 1 : p))}
                      disabled={caPage * caPageSize >= caTotal}
                      className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowCAStats(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
