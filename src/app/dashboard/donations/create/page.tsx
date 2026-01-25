"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function CreateDonationPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [purpose, setPurpose] = useState("");
  const [amountTarget, setAmountTarget] = useState<number | "">("");
  const [bkashNumber, setBkashNumber] = useState("");
  const [nagadNumber, setNagadNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [points, setPoints] = useState<number | "">("");
  const [mandatory, setMandatory] = useState(false);
  const [pointsToDeduct, setPointsToDeduct] = useState<number | "">("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    const role = (session as any)?.user?.role;
    if (status === "unauthenticated" || (role !== "ADMIN" && role !== "MASTER")) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    try {
      const payload = {
        purpose,
        amountTarget: amountTarget === "" ? undefined : Number(amountTarget),
        bkashNumber: bkashNumber || undefined,
        nagadNumber: nagadNumber || undefined,
        expiryDate,
        pointsPerDonation: points === "" ? 0 : Number(points),
        mandatory,
        pointsToDeduct: mandatory ? (pointsToDeduct === "" ? 0 : Number(pointsToDeduct)) : undefined,
      };
      const res = await fetch("/api/donations/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create donation");
      setStatusMsg("Created: " + (data?.id || "ok"));
    } catch (err: any) {
      setStatusMsg("Error: " + (err?.message || "Unknown"));
    }
  };

  const displayName = (session as any)?.user?.name || (session as any)?.user?.email || "Admin";

  const inputCls = 'w-full px-3 py-2 rounded-md border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#2b6cb0] focus:border-[#2b6cb0] text-slate-900 placeholder:text-slate-400';

  return (
    <DashboardLayout userRole={(session as any)?.user?.role || "ADMIN"} userName={displayName} userEmail={(session as any)?.user?.email || ""} userId={(session as any)?.user?.id || ""}>
      <div className="min-h-[calc(100vh-140px)] bg-transparent py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col gap-3 mb-6">
            <p className="text-sm uppercase tracking-[0.2em] text-[#0b1c33]">Donations</p>
            <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-[#0b1c33]">Create Donation Campaign</h1>
            <p className="text-[#0b1c33] text-sm md:text-base">Create a donation campaign for all volunteers.</p>
          </div>

          <form className="bg-white border border-slate-200 p-6 md:p-8 rounded-2xl shadow-sm space-y-5" onSubmit={submit}>
            <div>
              <label className="block text-sm font-medium text-[#07223f] mb-1">Purpose</label>
              <input value={purpose} onChange={(e)=>setPurpose(e.target.value)} placeholder="Purpose of this donation" className={inputCls} />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#07223f] mb-1">Amount Target (৳)</label>
              <input value={amountTarget as any} onChange={(e)=>setAmountTarget(e.target.value==='' ? '' : Number(e.target.value))} placeholder="Target Amount" type="number" className={inputCls} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#07223f] mb-1">Bkash Number</label>
                <input value={bkashNumber} onChange={(e)=>setBkashNumber(e.target.value)} placeholder="Bkash number" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#07223f] mb-1">Nagad Number</label>
                <input value={nagadNumber} onChange={(e)=>setNagadNumber(e.target.value)} placeholder="Nagad number" className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#07223f] mb-1">Expiry Date</label>
              <input value={expiryDate} onChange={(e)=>setExpiryDate(e.target.value)} type="datetime-local" className={inputCls} />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#07223f] mb-1">Points (awarded per donation)</label>
              <input value={points as any} onChange={(e)=>setPoints(e.target.value==='' ? '' : Number(e.target.value))} type="number" className={inputCls} />
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" checked={mandatory} onChange={(e)=>setMandatory(e.target.checked)} className="h-4 w-4" />
              <div>
                <p className="text-sm font-medium text-[#07223f]">Mandatory</p>
                <p className="text-xs text-slate-500">If checked, non-participation may deduct points.</p>
              </div>
            </div>

            {mandatory && (
              <div>
                <label className="block text-sm font-medium text-[#07223f] mb-1">Points To Deduct If Not Completed</label>
                <input value={pointsToDeduct as any} onChange={(e)=>setPointsToDeduct(e.target.value==='' ? '' : Number(e.target.value))} type="number" className={inputCls} />
              </div>
            )}

            <div className="flex items-center gap-3">
              <button type="submit" className="px-5 py-2.5 bg-[#2b6cb0] hover:bg-[#1f5aa0] text-white rounded-lg shadow transition">Create Donation</button>
              {statusMsg && <div className="text-sm text-gray-700">{statusMsg}</div>}
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
