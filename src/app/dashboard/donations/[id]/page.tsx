"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useModal } from "@/components/ui/ModalProvider";

export default function DonationDetailsPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params?.id;
  const { data: session, status } = useSession();
  const { toast } = useModal();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [trxId, setTrxId] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [donatedAt, setDonatedAt] = useState("");

  const role = (session as any)?.user?.role || "VOLUNTEER";
  const userStatus = (session as any)?.user?.status;
  const STAFF_ROLES = ["HR", "MASTER", "ADMIN", "DIRECTOR", "DATABASE_DEPT", "SECRETARIES"];
  const isOfficialOrStaff = STAFF_ROLES.includes(role) || userStatus === "OFFICIAL";

  const displayName =
    (session as any)?.user?.name ||
    (session as any)?.user?.email ||
    "User";

  const loadData = async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/donations/${campaignId}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load donation campaign");
      setData(json);
    } catch (e: any) {
      toast(e?.message || "Failed to load donation campaign", { type: "error" });
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (!campaignId || !isOfficialOrStaff) {
      setLoading(false);
      return;
    }
    void loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, status, isOfficialOrStaff]);

  const remainingAmount = useMemo(() => {
    return Number(data?.campaign?.remainingAmount ?? 0);
  }, [data]);

  const submitDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || saving) return;
    setSaving(true);
    try {
      const payload = {
        trxId: trxId.trim(),
        amount: amount === "" ? null : Number(amount),
        donatedAt,
      };
      const res = await fetch(`/api/donations/${campaignId}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to submit donation");

      toast("Donation submitted. Waiting for admin verification.", { type: "success" });
      setTrxId("");
      setAmount("");
      setDonatedAt("");
      await loadData();
    } catch (e: any) {
      toast(e?.message || "Failed to submit donation", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (session?.user && !isOfficialOrStaff) {
    return (
      <DashboardLayout userRole={role} userName={displayName} userEmail={(session as any)?.user?.email || ""} userId={(session as any)?.user?.id || ""}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Official Members Only</h2>
          <p className="text-slate-500 max-w-sm">Donation campaigns are available only to official members and staff.</p>
        </div>
      </DashboardLayout>
    );
  }

  const campaign = data?.campaign;
  const hasLockedSubmission = ["PENDING", "APPROVED"].includes(String(data?.mySubmission?.status || "").toUpperCase());
  const canSubmitDonation = Boolean(campaign?.canAcceptSubmission) && !saving && !hasLockedSubmission;

  return (
    <DashboardLayout userRole={role} userName={displayName} userEmail={(session as any)?.user?.email || ""} userId={(session as any)?.user?.id || ""}>
      <div className="min-h-[calc(100vh-140px)] bg-slate-50/30 py-6 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 animate-pulse h-48" />
          ) : !campaign ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-600">Donation campaign not found.</div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">{campaign.purpose || campaign.title}</h1>
                    <p className="text-sm text-slate-500 mt-1">Ends on {new Date(campaign.expiryDate).toLocaleString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${campaign.canAcceptSubmission ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                    {campaign.canAcceptSubmission ? "Open" : campaign.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-xs uppercase text-slate-400 font-semibold">Target</p>
                    <p className="text-xl font-bold text-slate-800">৳{Number(campaign.amountTarget || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-xs uppercase text-slate-400 font-semibold">Approved</p>
                    <p className="text-xl font-bold text-slate-800">৳{Number(campaign.approvedAmount || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-xs uppercase text-slate-400 font-semibold">Still Needed</p>
                    <p className="text-xl font-bold text-slate-800">৳{Number(campaign.remainingAmount || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-5 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: `${Math.min(100, campaign.amountTarget > 0 ? (Number(campaign.approvedAmount || 0) / Number(campaign.amountTarget)) * 100 : 0)}%` }}
                  />
                </div>

                <div className="mt-4 text-sm text-slate-600">
                  <p>bKash: <span className="font-semibold text-slate-800">{campaign.bkashNumber || "—"}</span></p>
                  <p>Nagad: <span className="font-semibold text-slate-800">{campaign.nagadNumber || "—"}</span></p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800">Submit Donation</h2>
                  <p className="text-sm text-slate-500 mt-1">Submission fields: TRXID, amount, date & time. Admin will verify before counting it.</p>

                  {hasLockedSubmission && (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Submission is disabled because your latest submission is {String(data?.mySubmission?.status || "").toUpperCase()}.
                    </div>
                  )}

                  <form className="mt-5 space-y-4" onSubmit={submitDonation}>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">TRXID</label>
                      <input
                        value={trxId}
                        onChange={(e) => setTrxId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200"
                        placeholder="Enter transaction ID"
                        disabled={!canSubmitDonation}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Amount (৳)</label>
                      <input
                        value={amount as any}
                        onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200"
                        type="number"
                        min={1}
                        max={remainingAmount > 0 ? remainingAmount : undefined}
                        disabled={!canSubmitDonation}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Date & Time</label>
                      <input
                        value={donatedAt}
                        onChange={(e) => setDonatedAt(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200"
                        type="datetime-local"
                        disabled={!canSubmitDonation}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!canSubmitDonation}
                      className="px-5 py-2.5 rounded-lg bg-[#0b2545] text-white font-semibold disabled:opacity-50"
                    >
                      {saving ? "Submitting..." : hasLockedSubmission ? "Submission Locked" : campaign.canAcceptSubmission ? "Submit for Verification" : "Campaign Closed"}
                    </button>
                  </form>

                  {data?.mySubmission && (
                    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-700">Your latest submission</p>
                      <p className="text-xs text-slate-500 mt-1">
                        TRXID: {data.mySubmission.trxId} • Amount: ৳{Number(data.mySubmission.amount || 0).toLocaleString()} • Status: {data.mySubmission.status}
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800">Contributors</h2>
                  <p className="text-sm text-slate-500 mt-1">Recently approved volunteers</p>

                  <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {(data?.recentApproved || []).length === 0 ? (
                      <p className="text-sm text-slate-400">No approved submissions yet.</p>
                    ) : (
                      data.recentApproved.map((item: any) => (
                        <div key={item.id} className="rounded-xl border border-slate-100 p-3">
                          <p className="text-sm font-semibold text-slate-700">{item.user?.fullName || "Volunteer"}</p>
                          <p className="text-xs text-slate-500">#{item.user?.volunteerId || "—"}</p>
                          <p className="text-xs text-slate-600 mt-1">৳{Number(item.amount || 0).toLocaleString()} • {new Date(item.approvedAt || item.donatedAt).toLocaleString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
