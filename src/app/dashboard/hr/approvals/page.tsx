"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";

export default function ApprovalsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userEmail = session?.user?.email || (typeof window !== "undefined" ? localStorage.getItem("userEmail") : null);
  const { user, loading: userLoading, error, refresh } = useCachedUserProfile<any>(userEmail);
  const [initialPayments, setInitialPayments] = useState<any[]>([]);
  const [finalPayments, setFinalPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPayment, setModalPayment] = useState<any | null>(null);
  const [assignMode, setAssignMode] = useState<'auto' | 'manual'>('auto');
  const [manualVolunteerId, setManualVolunteerId] = useState('');

  const isLoading = paymentsLoading || userLoading || status === "loading";
  const skeletonCards = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white p-4 rounded border space-y-3">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-200 rounded" />
          <div className="h-3 w-20 bg-gray-200 rounded" />
          <div className="h-3 w-28 bg-gray-200 rounded" />
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-gray-200 rounded" />
            <div className="h-8 w-20 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
  const displayName = user?.fullName || user?.username || session?.user?.name || "HR";
  const displayEmail = user?.email || session?.user?.email || "";
  const displayRole = (session as any)?.user?.role || (user?.role as "VOLUNTEER" | "HR" | "MASTER") || "HR";

  const formatDhaka = (value?: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("en-US", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

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
    if (!user || userLoading) return;
    if (user.role !== "HR" && user.role !== "MASTER") {
      router.push("/dashboard");
      return;
    }

    fetchPayments();
  }, [user, userLoading, router]);

  const fetchPayments = async () => {
    try {
      setPaymentsLoading(true);
      // Backend now returns only PENDING payments and a capped payload for speed
      const res = await fetch(`/api/hr/payments`, { cache: "no-store" });
      const data = await res.json();
      // show only pending payments (exclude already processed)
      const finals = (data.finalPayments || []).filter((p: any) => p.status === 'PENDING');
      setFinalPayments(finals);
    } catch (err) {
      console.error(err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const handleAction = async (id: string, type: "initial" | "final", action: "approve" | "reject") => {
    if (type === 'final' && action === 'approve') {
      // open modal to choose auto/manual assignment
      const payment = finalPayments.find((p) => p.id === id);
      setModalPayment(payment || null);
      setAssignMode('auto');
      setManualVolunteerId('');
      setModalOpen(true);
      return;
    }

    if (!confirm(`Are you sure to ${action} this ${type} payment?`)) return;
    try {
      const res = await fetch(`/api/hr/payments/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, action }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Failed");
        return;
      }
      await fetchPayments();
      alert("Action completed");
    } catch (err) {
      console.error(err);
      alert("Failed");
    }
  };

  const handleApproveFinal = async () => {
    if (!modalPayment) return;
    // if manual selected, require volunteer id
    if (assignMode === 'manual' && !manualVolunteerId.trim()) {
      alert('Please enter a volunteer ID');
      return;
    }

    try {
      const body: any = { type: 'final', action: 'approve', assignMode: assignMode };
      if (assignMode === 'manual') body.volunteerId = manualVolunteerId.trim();

      const res = await fetch(`/api/hr/payments/${modalPayment.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to approve');
        return;
      }
      setModalOpen(false);
      await fetchPayments();
      alert('Approved');
    } catch (err) {
      console.error(err);
      alert('Failed');
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
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Payments Approvals</h1>

        {/* Initial payments removed from approvals UI per request */}

        <section>
          <h2 className="text-lg font-semibold mb-3">Final Payments (ID Card - 170 BDT)</h2>
          {isLoading ? (
            skeletonCards
          ) : finalPayments.length === 0 ? (
            <div className="text-sm text-gray-600 bg-white border rounded p-4">No pending final payments.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {finalPayments.map((p) => (
                <div key={p.id} className="bg-white p-4 rounded border">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{p.user?.fullName || p.user?.email || "Unknown user"}</div>
                      <div className="text-sm text-gray-600">{[p.user?.email, p.user?.phone].filter(Boolean).join(" • ") || "No contact info"}</div>
                      {p.user?.volunteerId && (
                        <div className="text-xs text-gray-500">Volunteer ID: {p.user.volunteerId}</div>
                      )}
                      <div className="text-xs text-gray-500">User status: {p.user?.status ?? "N/A"}</div>
                      <div className="text-xs text-gray-500">Submitted: {formatDhaka(p.createdAt)}</div>
                      <div className="text-xs mt-1">Payment status: {p.status}</div>
                      <div className="mt-2 text-sm">
                        <div><strong>Transaction ID:</strong> {p.trxId}</div>
                        <div><strong>Sender:</strong> {p.senderNumber}</div>
                        <div><strong>Method:</strong> {p.paymentMethod}</div>
                        <div><strong>Paid at:</strong> {p.paymentDate ? formatDhaka(p.paymentDate) : p.paymentTime || ""}</div>
                        {p.proofUrl && (
                          <div className="mt-2"><a href={p.proofUrl} target="_blank" rel="noreferrer" className="text-blue-600">View proof</a></div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => handleAction(p.id, 'final', 'approve')} className="px-3 py-1 bg-green-50 text-green-700 rounded">Approve</button>
                      <button onClick={() => handleAction(p.id, 'final', 'reject')} className="px-3 py-1 bg-red-50 text-red-700 rounded">Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal for approve options */}
          {modalOpen && modalPayment && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
                <h3 className="text-lg font-semibold mb-2">Approve Final Payment</h3>
                <p className="text-sm text-gray-600 mb-4">Choose how to assign the volunteer ID for <strong>{modalPayment.user?.fullName || modalPayment.user?.email}</strong></p>

                <div className="flex gap-3 mb-4">
                  <label className={"flex-1 p-3 border rounded cursor-pointer " + (assignMode === 'auto' ? 'border-[#1E3A5F] bg-[#f1f8ff]' : '')}>
                    <input type="radio" name="assign" checked={assignMode === 'auto'} onChange={() => setAssignMode('auto')} className="mr-2" /> Auto-generate ID
                    <div className="text-xs text-gray-500">System will generate next numeric volunteer ID</div>
                  </label>
                  <label className={"flex-1 p-3 border rounded cursor-pointer " + (assignMode === 'manual' ? 'border-[#1E3A5F] bg-[#f1f8ff]' : '')}>
                    <input type="radio" name="assign" checked={assignMode === 'manual'} onChange={() => setAssignMode('manual')} className="mr-2" /> Manual
                    <div className="text-xs text-gray-500">Enter a volunteer ID to assign</div>
                  </label>
                </div>

                {assignMode === 'manual' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Volunteer ID</label>
                    <input value={manualVolunteerId} onChange={(e) => setManualVolunteerId(e.target.value)} className="w-full px-3 py-2 border rounded" />
                    <p className="text-xs text-gray-500 mt-1">Ensure this ID is unique.</p>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button onClick={() => setModalOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                  <button onClick={handleApproveFinal} className="px-4 py-2 bg-[#1E3A5F] text-white rounded">Approve</button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
