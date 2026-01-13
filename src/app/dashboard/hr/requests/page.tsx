"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Calendar, Eye, AlertTriangle } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";

interface Application {
  id: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    institute: { name: string } | null;
    joiningSemester: string;
  };
  trxId: string;
  paymentMethod: string;
  status: string;
  appliedAt: string;
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

  const isLoading = loading || userCacheLoading || status === "loading";
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
  const displayRole = (session as any)?.user?.role || (user?.role as "VOLUNTEER" | "HR" | "MASTER" | "ADMIN") || "HR";
  
  // Track if initial fetch has been done
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    // Check authentication and fetch user
    const fetchUserAndApplications = async () => {
      if (status === "unauthenticated") {
        router.push("/auth");
        return;
      }

      if (status === "loading" || hasFetched) return;

      if (!email) {
        router.push("/auth");
        return;
      }

      try {
        const currentUser = user || (await refreshUser());
        if (!currentUser) return;
        if (currentUser.role !== "HR" && currentUser.role !== "MASTER" && currentUser.role !== "ADMIN") {
          router.push("/dashboard");
          return;
        }
        
        // Mark as fetched to prevent re-fetching
        setHasFetched(true);
        
        // Fetch applications
        const response = await fetch("/api/hr/applications?status=INTERVIEW_REQUESTED");
        const data = await response.json();
        setApplications(data.applications || []);
        
        // Check slot availability
        const slotsResponse = await fetch("/api/hr/interview-slots/available");
        const slotsData = await slotsResponse.json();
        setHasAvailableSlots(slotsData.hasAvailableSlots);
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
      const slotsResponse = await fetch("/api/hr/interview-slots/available");
      const slotsData = await slotsResponse.json();
      setHasAvailableSlots(slotsData.hasAvailableSlots);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (applicationId: string) => {
    if (!hasAvailableSlots) {
      alert("No available interview slots. Please create slots first.");
      return;
    }

    try {
      const response = await fetch(`/api/hr/applications/${applicationId}/approve`, {
        method: "POST",
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(`Application approved! Assigned to interview on ${new Date(data.slot.startTime).toLocaleString()}\n\nMeet Link: ${data.slot.meetLink}`);
        fetchApplications();
      } else {
        alert(data.error || "Failed to approve application");
      }
    } catch (error) {
      console.error("Error approving application:", error);
      alert("Failed to approve application");
    }
  };

  const handleReject = async (applicationId: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;

    try {
      const response = await fetch(`/api/hr/applications/${applicationId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      
      if (response.ok) {
        alert("Application rejected.");
        fetchApplications();
      }
    } catch (error) {
      console.error("Error rejecting application:", error);
    }
  };

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
        
        {!hasAvailableSlots && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900">No Interview Slots Available</h3>
              <p className="text-sm text-yellow-700 mt-1">
                You need to create interview slots before approving applications. 
                <a href="/dashboard/hr/interviews" className="underline ml-1 font-medium">
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
                            <p className="font-medium">{app.paymentMethod.toUpperCase()}</p>
                            <p className="text-xs text-gray-500">TRX: {app.trxId}</p>
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
                <p className="text-gray-900">{selectedApp.paymentMethod.toUpperCase()}</p>
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
    </div>
    </DashboardLayout>
  );
}
