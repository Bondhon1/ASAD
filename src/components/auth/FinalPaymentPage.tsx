"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { clearUserProfileCache } from "@/lib/cacheUtils";

interface Props { userEmail?: string }

const paymentMethods = [
  { id: "bkash", name: "bKash", dummy: "01989254157" },
  { id: "nagad", name: "Nagad", dummy: "01983600518" },
  // Visa and Mastercard removed
];

export default function FinalPaymentPage({ userEmail: propEmail }: Props) {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState("bkash");
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentTime, setPaymentTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");

  // Prefill basic info if available
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  
  // Payment status check
  const [existingPayment, setExistingPayment] = useState<any>(null);
  const [userStatus, setUserStatus] = useState<string>("");
  const [checkingPayment, setCheckingPayment] = useState(true);

  useEffect(() => {
    if (propEmail) {
      setEmail(propEmail);
      fetchProfile(propEmail);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const e = params.get("email") || localStorage.getItem("userEmail");
    if (e) {
      setEmail(e);
      fetchProfile(e);
    }
  }, [propEmail]);

  const fetchProfile = async (emailToUse: string) => {
    try {
      // Use lite mode and bustCache for payment page (minimal fields, fresh data)
      const res = await fetch(`/api/user/profile?email=${encodeURIComponent(emailToUse)}&bustCache=1&lite=1`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = await res.json();
      if (data?.user) {
        setFullName(data.user.fullName || "");
        setPhone(data.user.phone || "");
        setUserStatus(data.user.status || "");
        setExistingPayment(data.user.finalPayment || null);
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    } finally {
      setCheckingPayment(false);
    }
  };

  const currentMethod = paymentMethods.find((m) => m.id === paymentMethod)!;

  const handleCopy = (text: string) => {
    try { navigator.clipboard.writeText(text); } catch { /* noop */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Unable to identify user. Please sign in and try again.");
      return;
    }

    if (!senderNumber || !trxId || !paymentDate || !paymentTime) {
      setError("Please fill all payment fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payments/final", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, paymentMethod, senderNumber, trxId, paymentDate, paymentTime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      
      // Set skip flag to prevent redirect back to payment page  
      if (typeof window !== "undefined") {
        try {
          const skipUntil = Date.now() + 30000; // 30 seconds
          sessionStorage.setItem('skipPaymentRedirectUntil', skipUntil.toString());
          sessionStorage.setItem('paymentJustSubmitted', 'true');
          // Clear all cached profile data using utility function
          clearUserProfileCache(email);
        } catch (e) {
          // ignore
        }
        // Redirect immediately
        window.location.href = `/dashboard?paymentSubmitted=1`;
      }
    } catch (err: any) {
      setError(err.message || "Submission failed");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl p-8 shadow max-w-lg w-full text-center">
          <div className="text-green-600 text-4xl mb-4">✓</div>
          <h3 className="text-2xl font-semibold mb-2">Payment submitted</h3>
          <p className="text-sm text-muted">Thanks — your payment is sent for verification. You will be redirected shortly.</p>
        </motion.div>
      </div>
    );
  }

  // Show loading while checking payment status
  if (checkingPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F] mx-auto mb-4"></div>
          <p className="text-sm text-muted">Checking payment status...</p>
        </div>
      </div>
    );
  }

  // Check if user is not eligible
  const isEligible = userStatus === "INTERVIEW_PASSED" || userStatus === "FINAL_PAYMENT_REJECTED";
  
  // Check if payment already exists and is not rejected
  const hasNonRejectedPayment = existingPayment && existingPayment.status !== "REJECTED";

  // Show not eligible message
  if (!isEligible) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl p-8 shadow max-w-lg w-full">
          <div className="text-amber-600 text-4xl mb-4 text-center">⚠️</div>
          <h3 className="text-2xl font-semibold mb-2 text-center">Not Eligible for Final Payment</h3>
          <p className="text-sm text-muted text-center mb-4">
            Your current status is <span className="font-semibold text-[#1E3A5F]">{userStatus}</span>. 
            You need to complete your interview first before proceeding with the final payment.
          </p>
          <div className="flex justify-center mt-6">
            <a href="/dashboard" className="px-6 py-3 bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-lg font-semibold">
              Go to Dashboard
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show already submitted message
  if (hasNonRejectedPayment) {
    const statusColors: Record<string, { bg: string; text: string; icon: string }> = {
      PENDING: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: "⏳" },
      APPROVED: { bg: "bg-green-50 border-green-200", text: "text-green-700", icon: "✓" },
      VERIFIED: { bg: "bg-green-50 border-green-200", text: "text-green-700", icon: "✓" }
    };
    
    const statusStyle = statusColors[existingPayment.status] || statusColors.PENDING;
    
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl p-8 shadow max-w-lg w-full">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">{statusStyle.icon}</div>
            <h3 className="text-2xl font-semibold mb-2">Final Payment Already Submitted</h3>
          </div>
          
          <div className={`p-4 ${statusStyle.bg} border rounded-lg mb-4`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Status:</span>
              <span className={`font-semibold ${statusStyle.text}`}>{existingPayment.status}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Amount:</span>
              <span className="font-semibold">{existingPayment.amount} BDT</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Submitted:</span>
              <span className="text-sm">{new Date(existingPayment.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}</span>
            </div>
          </div>

          {existingPayment.status === "PENDING" && (
            <p className="text-sm text-muted text-center mb-4">
              Your payment is being reviewed. You'll be notified once it's verified. This usually takes up to 24 hours.
            </p>
          )}

          {(existingPayment.status === "APPROVED" || existingPayment.status === "VERIFIED") && (
            <p className="text-sm text-green-600 text-center mb-4 font-medium">
              🎉 Your payment has been verified! You are now an official volunteer.
            </p>
          )}

          <div className="flex justify-center mt-6">
            <a href="/dashboard" className="px-6 py-3 bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-lg font-semibold">
              Go to Dashboard
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-2xl font-bold mb-1">Final Payment for ID Card</h2>
            <p className="text-sm text-muted mb-4">Amount due: <span className="font-semibold">170 BDT</span></p>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Full Name</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-[#1E3A5F]/30" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Registered Phone</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-[#1E3A5F]/30" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Payment Method</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {paymentMethods.map((m) => (
                    <button key={m.id} type="button" onClick={() => setPaymentMethod(m.id)} className={`p-3 rounded-lg border ${paymentMethod === m.id ? 'border-[#1E3A5F] bg-[#1E3A5F]/5' : 'border-border hover:border-[#1E3A5F]/40'}`}>
                      <div className="font-semibold">{m.name}</div>
                      <div className="text-xs text-muted">{m.dummy}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-blue-800 font-semibold">Send payment to</div>
                    <div className="text-lg font-mono text-blue-900 mt-1">{currentMethod.dummy}</div>
                  </div>
                  <div>
                    <button type="button" onClick={() => handleCopy(currentMethod.dummy)} className="px-3 py-2 bg-white border rounded">Copy</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Sender Number</label>
                  <input value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)} placeholder="e.g. 01XXXXXXXXX" className="w-full px-4 py-3 border border-border rounded-lg" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Transaction ID</label>
                  <input value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="trx12345" className="w-full px-4 py-3 border border-border rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full px-4 py-3 border border-border rounded-lg" />
                <input type="time" value={paymentTime} onChange={(e) => setPaymentTime(e.target.value)} className="w-full px-4 py-3 border border-border rounded-lg" />
              </div>

              <div className="flex items-center justify-end gap-3">
                <a href="/dashboard" className="px-4 py-2 border rounded">Cancel</a>
                <button type="submit" disabled={loading} className="px-5 py-3 bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-lg font-semibold disabled:opacity-60">
                  {loading ? 'Submitting...' : 'Submit Payment (170 BDT)'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        <aside className="hidden lg:block">
          <div className="bg-white rounded-2xl shadow p-6 sticky top-24">
            <h4 className="font-semibold mb-2">Payment Tips</h4>
            <ul className="text-sm text-muted space-y-2">
              <li>Double-check the transaction ID before submitting.</li>
              <li>Use the sender number you paid from.</li>
              <li>Admin verifies payments within 24 hours.</li>
            </ul>
            <div className="mt-4 text-xs text-muted">Need help? Contact amarsomoyamardesh.it@gmail.com</div>
          </div>
        </aside>
          </div>
        </div>
      );
    }
