"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Calendar, Eye } from "lucide-react";

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
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await fetch("/api/hr/applications?status=INTERVIEW_REQUESTED");
      const data = await response.json();
      setApplications(data.applications || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (applicationId: string) => {
    try {
      const response = await fetch(`/api/hr/applications/${applicationId}/approve`, {
        method: "POST",
      });
      
      if (response.ok) {
        alert("Application approved! Payment verified.");
        fetchApplications();
      }
    } catch (error) {
      console.error("Error approving application:", error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">New Volunteer Requests</h1>
        <p className="text-gray-600 mt-2">Review and approve payment submissions</p>
      </div>

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
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Approve"
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
  );
}
