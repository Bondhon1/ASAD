"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ApprovalsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [initialPayments, setInitialPayments] = useState<any[]>([]);
  const [finalPayments, setFinalPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (status === "unauthenticated") return router.push("/auth");
      if (status === "loading") return;
      const email = session?.user?.email || localStorage.getItem("userEmail");
      if (!email) return router.push("/auth");

      const userRes = await fetch(`/api/user/profile?email=${encodeURIComponent(email)}`);
      const userData = await userRes.json();
      if (!userData.user || (userData.user.role !== "HR" && userData.user.role !== "MASTER")) return router.push("/dashboard");
      setUser(userData.user);

      await fetchPayments();
      setLoading(false);
    };
    load();
  }, [status]);

  const fetchPayments = async () => {
    try {
      const res = await fetch(`/api/hr/payments`);
      const data = await res.json();
      setFinalPayments(data.finalPayments || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAction = async (id: string, type: "initial" | "final", action: "approve" | "reject") => {
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

  if (loading) return <DashboardLayout userRole="HR" userName="Loading..." userEmail=""><div className="p-6">Loading...</div></DashboardLayout>;
  if (!user) return null;

  return (
    <DashboardLayout userRole={(user.role as any) || "HR"} userName={user.fullName || user.username} userEmail={user.email}>
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Payments Approvals</h1>

        {/* Initial payments removed from approvals UI per request */}

        <section>
          <h2 className="text-lg font-semibold mb-3">Final Payments (ID Card - 170 BDT)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {finalPayments.map((p) => (
              <div key={p.id} className="bg-white p-4 rounded border flex justify-between items-center">
                <div>
                  <div className="font-medium">{p.user?.fullName || p.user?.email}</div>
                  <div className="text-sm text-gray-600">{p.user?.email} • {p.user?.phone}</div>
                  <div className="text-xs text-gray-500">Submitted: {new Date(p.createdAt).toLocaleString()}</div>
                  <div className="text-xs mt-1">Status: {p.status}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => handleAction(p.id, 'final', 'approve')} className="px-3 py-1 bg-green-50 text-green-700 rounded">Approve</button>
                  <button onClick={() => handleAction(p.id, 'final', 'reject')} className="px-3 py-1 bg-red-50 text-red-700 rounded">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
