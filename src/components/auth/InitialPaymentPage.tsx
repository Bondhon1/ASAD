"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Footer } from '@/components/layout/Footer';
import clsx from "clsx";

// Helper to clear all cached user data
const clearAllCaches = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('asad_user_profile_v1');
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('asad_user_profile_v2_')) {
          localStorage.removeItem(key);
        }
      });
      localStorage.removeItem('asad_session');
      localStorage.removeItem('userEmail');
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  } catch (e) {
    console.error('Error clearing cache:', e);
  }
};

type PaymentMethod = "bkash" | "nagad";

interface PaymentMethodInfo {
  id: PaymentMethod;
  name: string;
  icon: string;
  dummyNumber: string;
  description: string;
}

const paymentMethods: PaymentMethodInfo[] = [
  {
    id: "bkash",
    name: "bKash",
    icon: "🏦",
    dummyNumber: "01989254157",
    description: "Digital wallet service",
  },
  {
    id: "nagad",
    name: "Nagad",
    icon: "📱",
    dummyNumber: "01983600518",
    description: "Mobile banking service",
  },
];

const containerVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
    },
  },
};

export default function InitialPaymentPage() {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("bkash");
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentTime, setPaymentTime] = useState("");
  const [caReferenceId, setCAReferenceId] = useState("");
  const [referrerType, setReferrerType] = useState<"CA" | "VOLUNTEER" | "">("");
  const [caSearchQuery, setCASearchQuery] = useState("");
  const [caReferences, setCAReferences] = useState<Array<{ id: string; type: "CA" | "VOLUNTEER"; code: string; name: string; leader?: string; email?: string }>>([]);
  const [showCADropdown, setShowCADropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isRejected, setIsRejected] = useState(false);
  
  // User basic info
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [instituteSearchQuery, setInstituteSearchQuery] = useState("");
  const [showOtherInstitute, setShowOtherInstitute] = useState(false);
  const [educationLevel, setEducationLevel] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ label: string; value: string; eiin?: number | string; institutionType?: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const instituteInputRef = useRef<HTMLInputElement | null>(null);
  const caInputRef = useRef<HTMLInputElement | null>(null);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get user email from URL params or localStorage and check if previous payment was rejected
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailFromUrl = params.get("email");
    const emailFromStorage = localStorage.getItem("userEmail");

    // prefer authenticated session email
    if (status === "authenticated" && session?.user?.email) {
      setUserEmail(session.user.email);
      checkRejectedAndPrefill(session.user.email);
      return;
    }

    // Prevent duplicate mount actions (dev double-mount / StrictMode / HMR).
    const mountKey = `paymentsInitial:${emailFromUrl || emailFromStorage || 'no-email'}`;
    const alreadyMounted = sessionStorage.getItem(mountKey);
    if (alreadyMounted) {
      if (emailFromStorage) setUserEmail(emailFromStorage);
      return;
    }
    // mark as mounted for short period
    try { sessionStorage.setItem(mountKey, 'visited'); } catch (e) {}

    const emailToUse = emailFromUrl || emailFromStorage;
    if (emailToUse) {
      setUserEmail(emailToUse);
      checkRejectedAndPrefill(emailToUse);
      return;
    }

    // if session loading, wait; if unauthenticated and no email, redirect
    if (status === "unauthenticated") {
      setError("Session expired. Please sign up again.");
      setTimeout(() => {
        window.location.href = "/auth";
      }, 2000);
    }
    // otherwise, do nothing while loading
  }, [session, status]);

  const checkRejectedAndPrefill = async (emailToUse: string) => {
    try {
      const res = await fetch(`/api/user/profile?email=${encodeURIComponent(emailToUse)}`);
      const data = await res.json();
      if (data?.user && data.user.status === "REJECTED") {
        setIsRejected(true);
        setFullName(data.user.fullName || "");
        setPhone(data.user.phone || "");
        if (data.user.institute) setInstituteName(data.user.institute.name || "");
      }
    } catch (e) {
      // ignore
    }
  };

  const currentMethod = paymentMethods.find((m) => m.id === selectedMethod)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!fullName || !phone || !instituteName || !educationLevel || !senderNumber || !trxId || !paymentDate || !paymentTime) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/payments/initial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          fullName,
          phone,
          instituteName,
          educationLevel,
          paymentMethod: selectedMethod,
          senderNumber,
          trxId,
          paymentDate,
          paymentTime,
          referrerType: referrerType || null,
          referrerUserId: referrerType === "VOLUNTEER" ? (caReferenceId || null) : null,
          caReferenceId: referrerType === "CA" ? (caReferenceId || null) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Payment submission failed");
      }

      setSuccess(true);
      // Update session to refresh JWT needsPayment flag before redirect (only if authenticated)
      if (status === 'authenticated' && typeof updateSession === 'function') {
        await updateSession();
      }
      // Navigate to dashboard with a flag to prevent the dashboard auto-redirect
      // from immediately sending the user back to the payment form while profile updates propagate.
      setTimeout(() => {
        router.push('/dashboard?paymentSubmitted=1');
      }, 800);
    } catch (err: any) {
      setError(err.message || "Payment submission failed. Please verify your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
        <motion.div
          className="absolute top-0 left-0 w-80 h-80 bg-[#1E3A5F]/5 rounded-full blur-3xl"
          animate={{ y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-96 h-96 bg-[#1E3A5F]/5 rounded-full blur-3xl"
          animate={{ y: [0, -30, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />

        <motion.div
          className="relative z-10 bg-white rounded-2xl card-shadow p-8 text-center max-w-md"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="mb-6 flex justify-center"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </motion.div>

          <h1 className="text-2xl font-bold text-ink mb-2">
            Payment Submitted!
          </h1>
          <p className="text-muted mb-6">
            Thank you for your payment. Our admin will verify your transaction shortly.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Redirecting to dashboard in a moment...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>
      {/* Themed Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md transition-all duration-300">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-20 items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative h-11 w-11 overflow-hidden rounded-xl shadow-md transition-transform duration-300 group-hover:scale-110">
                <Image src="/logo.jpg" alt="ASAD Logo" fill className="object-cover" />
              </div>
              <span className="text-lg font-bold text-[#1E3A5F]">ASAD</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              {['Home', 'About', 'Sectors', 'Activities'].map((item) => (
                <Link key={item} href="/" className="text-sm font-semibold text-gray-600 hover:text-[#1E3A5F] transition-colors duration-300">{item}</Link>
              ))}
              {session && (
                <Link href="/dashboard" className="text-sm font-semibold text-gray-600 hover:text-[#1E3A5F] transition-colors duration-300">Dashboard</Link>
              )}
              {session ? (
                <button onClick={() => { clearAllCaches(); window.location.href = '/api/auth/signout'; }} className="rounded-lg bg-red-600 px-7 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-all duration-300">Logout</button>
              ) : (
                <Link href="/auth" className="rounded-lg bg-[#1E3A5F] px-7 py-3 text-sm font-semibold text-white hover:bg-[#2a4d75] transition-all duration-300">Join Now</Link>
              )}
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex flex-col gap-1.5 p-2"
              aria-label="Toggle menu"
            >
              <span className={`block h-0.5 w-6 bg-[#1E3A5F] transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block h-0.5 w-6 bg-[#1E3A5F] transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-6 bg-[#1E3A5F] transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>
        <div className={`md:hidden bg-white border-t border-gray-100 overflow-hidden transition-all duration-300 ${mobileMenuOpen ? 'max-h-96 py-4' : 'max-h-0'}`}>
          <div className="flex flex-col gap-4 px-6">
            {['Home', 'About', 'Sectors', 'Activities'].map((item) => (
              <Link key={item} href="/" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-gray-600 hover:text-[#1E3A5F] transition-colors duration-300">{item}</Link>
            ))}
            {session && (
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-gray-600 hover:text-[#1E3A5F] transition-colors duration-300">Dashboard</Link>
            )}
            {session ? (
              <button onClick={() => { clearAllCaches(); window.location.href = '/api/auth/signout'; }} className="rounded-lg bg-red-600 px-7 py-3 text-center text-sm font-semibold text-white">Logout</button>
            ) : (
              <Link href="/auth" onClick={() => setMobileMenuOpen(false)} className="rounded-lg bg-[#1E3A5F] px-7 py-3 text-center text-sm font-semibold text-white transition-all duration-300">Join Now</Link>
            )}
          </div>
        </div>
      </nav>

    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-4 md:p-8 relative overflow-hidden" style={{ paddingTop: '8rem' }}>
      {/* Decorative elements */}
      <motion.div
        className="absolute top-0 left-0 w-80 h-80 bg-[#1E3A5F]/5 rounded-full blur-3xl"
        animate={{ y: [0, 30, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-96 h-96 bg-[#1E3A5F]/5 rounded-full blur-3xl"
        animate={{ y: [0, -30, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <div className="relative z-10 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-ink mb-2">
            Complete Your Registration
          </h1>
          <p className="text-lg text-muted">
            Make a payment of <span className="font-bold text-[#1E3A5F]">30 BDT</span> to activate your account
          </p>
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl card-shadow overflow-hidden"
          variants={containerVariants}
          initial="initial"
          animate="animate"
        >
          <form onSubmit={handleSubmit} className="p-8">
            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Basic Information Section */}
            <div className="mb-8 pb-8 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-ink mb-6">Personal Information</h3>
              
              <motion.div variants={itemVariants} className="mb-6">
                <label className="block text-sm font-semibold text-ink mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/50 focus:border-[#1E3A5F] transition-all"
                  required
                />
              </motion.div>

              <motion.div variants={itemVariants} className="mb-6">
                <label className="block text-sm font-semibold text-ink mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/50 focus:border-[#1E3A5F] transition-all"
                  required
                />
                <p className="text-xs text-muted mt-1">11 digits starting with 01</p>
              </motion.div>

              <motion.div variants={itemVariants} className="mb-6">
                <label className="block text-sm font-semibold text-ink mb-2">
                  School/Institute <span className="text-red-500">*</span>
                </label>
                
                {!showOtherInstitute ? (
                  <div className="relative">
                    <input
                      ref={instituteInputRef}
                      type="text"
                      value={instituteName}
                      onChange={(e) => {
                        setInstituteName(e.target.value);
                        setInstituteSearchQuery(e.target.value);
                        setShowSuggestions(true);
                        
                        const val = e.target.value;
                        if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
                        if (val.length >= 2) {
                          suggestTimerRef.current = setTimeout(() => {
                            fetch(`/api/institutes/suggestions?q=${encodeURIComponent(val)}`, { cache: 'no-store' })
                              .then(res => res.json())
                              .then(data => setSuggestions(data.suggestions || []))
                              .catch(() => setSuggestions([]));
                          }, 400);
                        } else {
                          setSuggestions([]);
                        }
                      }}
                      onFocus={() => {
                        setShowSuggestions(true);
                        // Don't fetch here — onChange handles debounced fetching.
                        // Fetching on focus with a stale instituteName closure would
                        // cancel the in-flight onChange timer and show stale results.
                      }}
                      placeholder="Type to search your school/institute"
                      className="w-full pr-10 px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/50 focus:border-[#1E3A5F] transition-all"
                      required
                    />

                    {instituteName && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInstituteName("");
                          setInstituteSearchQuery("");
                          setSuggestions([]);
                          setShowSuggestions(false);
                          instituteInputRef.current?.focus();
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-2"
                        aria-label="Clear institute"
                      >
                        ✕
                      </button>
                    )}

                    {showSuggestions && (suggestions.length > 0 || instituteSearchQuery.length >= 2) && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-hidden flex flex-col">
                        <div className="overflow-y-auto">
                          {suggestions.length > 0 ? (
                            suggestions.slice(0, 20).map((s) => (
                              <button
                                type="button"
                                key={s.value}
                                onPointerDown={(e) => {
                                  e.preventDefault();
                                  setInstituteName(s.value);
                                  setInstituteSearchQuery(s.value);
                                  setShowSuggestions(false);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium text-sm text-gray-900">{s.value}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {s.eiin ? `EIIN: ${s.eiin}` : ''}{s.eiin && s.institutionType ? ' • ' : ''}{s.institutionType ? s.institutionType : ''}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              {instituteSearchQuery.length >= 2 ? 'No results found. Try a different search or add manually.' : 'Type at least 2 characters to search'}
                            </div>
                          )}
                        </div>
                        
                        <button
                          type="button"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            setShowOtherInstitute(true);
                            setInstituteName("");
                            setInstituteSearchQuery("");
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 active:bg-blue-100 bg-blue-50 border-t-2 border-blue-200 text-blue-700 font-medium"
                        >
                          ➕ My institute is not listed - Enter manually
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={instituteName}
                      onChange={(e) => setInstituteName(e.target.value)}
                      placeholder="Enter your institute name manually"
                      className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/50 focus:border-[#1E3A5F] transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowOtherInstitute(false);
                        setInstituteName("");
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      ← Back to search
                    </button>
                  </div>
                )}
                
                <p className="text-xs text-muted mt-1">
                  {!showOtherInstitute 
                    ? "Type at least 2 characters to search. If not found, you can enter manually."
                    : "Enter your institute name manually since it's not in our database."
                  }
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="mb-6">
                <label className="block text-sm font-semibold text-ink mb-2">
                  Class/Education Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/50 focus:border-[#1E3A5F] transition-all"
                  required
                >
                  <option value="">Select your class</option>
                  <option value="7">Class 7</option>
                  <option value="8">Class 8</option>
                  <option value="9">Class 9</option>
                  <option value="10">Class 10</option>
                  <option value="11">Class 11</option>
                  <option value="12">Class 12</option>
                  <option value="admission_candidate">Admission candidate</option>
                  <option value="medical_student">Medical student</option>
                  <option value="university">University</option>
                </select>
              </motion.div>
            </div>

            {/* Payment Information Section */}
            <h3 className="text-lg font-semibold text-ink mb-6">Payment Details</h3>

            {/* Payment Method Selection */}
            <motion.div variants={itemVariants} className="mb-8">
              <label className="block text-sm font-semibold text-ink mb-4">
                Select Payment Method
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {paymentMethods.map((method) => (
                  <motion.button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id)}
                    className={clsx(
                      "p-4 rounded-lg border-2 transition-all text-left",
                      selectedMethod === method.id
                        ? "border-[#1E3A5F] bg-[#1E3A5F]/5"
                        : "border-border hover:border-[#1E3A5F]/50"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-2xl mb-2">{method.icon}</div>
                    <div className="font-semibold text-ink">{method.name}</div>
                    <div className="text-sm text-muted">{method.description}</div>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Dummy Number Display */}
            <motion.div
              variants={itemVariants}
              className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <p className="text-sm text-blue-700 mb-2">
                'Send money' to this {currentMethod.name} number:
              </p>
              <div className="flex items-center justify-between">
                <code className="text-lg font-mono font-semibold text-blue-900">
                  {currentMethod.dummyNumber}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(currentMethod.dummyNumber);
                  }}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  📋 Copy
                </button>
              </div>
            </motion.div>

            {/* Form Fields */}
            <motion.div variants={itemVariants} className="mb-6">
              <label className="block text-sm font-semibold text-ink mb-2">
                Sender Number / Account Number
              </label>
              <input
                type="text"
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value)}
                placeholder="Your phone number or account number"
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/50 focus:border-[#1E3A5F] transition-all"
                required
              />
            </motion.div>

            <motion.div variants={itemVariants} className="mb-6">
              <label className="block text-sm font-semibold text-ink mb-2">
                Transaction ID
              </label>
              <input
                type="text"
                value={trxId}
                onChange={(e) => setTrxId(e.target.value)}
                placeholder="Transaction ID from your payment provider"
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/50 focus:border-[#1E3A5F] transition-all"
                required
              />
              <p className="text-xs text-muted mt-1">
                Usually found in your transaction receipt or SMS confirmation
              </p>
            </motion.div>

            {/* Reference field removed */}

            <motion.div variants={itemVariants} className="mb-6 relative">
              <label className="block text-sm font-semibold text-ink mb-2">
                Referrer (Campus Ambassador or Volunteer) - Optional
              </label>
              <input
                ref={caInputRef}
                type="text"
                value={caSearchQuery}
                onChange={async (e) => {
                  const query = e.target.value;
                  setCASearchQuery(query);
                  setShowCADropdown(true);
                  
                  if (query.length >= 2) {
                    try {
                      const res = await fetch(`/api/ca-references/search?q=${encodeURIComponent(query)}`);
                      const data = await res.json();
                      setCAReferences(data.references || []);
                    } catch (error) {
                      console.error('Error searching references:', error);
                      setCAReferences([]);
                    }
                  } else {
                    setCAReferences([]);
                  }
                }}
                onFocus={() => setShowCADropdown(true)}
                onBlur={() => setTimeout(() => setShowCADropdown(false), 200)}
                placeholder="Search by CA Code (e.g., LE001), Volunteer ID, or name"
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/50 focus:border-[#1E3A5F] transition-all"
              />
              <p className="text-xs text-muted mt-1">
                If you were referred by a Campus Ambassador or official Volunteer, search by CA Code (e.g., LE001), Volunteer ID, or their name. Leave blank if not applicable.
              </p>
              
              {showCADropdown && caReferences.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg max-h-48 overflow-y-auto shadow-lg">
                  {caReferences.map((ref) => (
                    <button
                      type="button"
                      key={ref.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setReferrerType(ref.type);
                          if (ref.type === "CA") {
                            setCAReferenceId(ref.id);
                          } else {
                            // volunteer selected: store the volunteer user id in caReferenceId state for compatibility
                            // but we will send referrerUserId separately on submit
                            setCAReferenceId(ref.id);
                          }
                          setCASearchQuery(`${ref.code} - ${ref.name}`);
                          setShowCADropdown(false);
                        }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          ref.type === "CA" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                        }`}>
                          {ref.type}
                        </span>
                        <div className="font-semibold text-sm text-gray-900">
                          {ref.code} - {ref.name}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {ref.type === "CA" ? `Team Leader: ${ref.leader}` : ref.email}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {caReferenceId && (
                <button
                  type="button"
                  onClick={() => {
                    setCAReferenceId('');
                    setReferrerType('');
                    setCASearchQuery('');
                    setCAReferences([]);
                  }}
                  className="absolute right-3 top-10 text-gray-400 hover:text-gray-700"
                  aria-label="Clear referrer"
                >
                  ✕
                </button>
              )}
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/50 focus:border-[#1E3A5F] transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">
                  Payment Time
                </label>
                <input
                  type="time"
                  value={paymentTime}
                  onChange={(e) => setPaymentTime(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/50 focus:border-[#1E3A5F] transition-all"
                  required
                />
              </div>
            </motion.div>

            {/* Info Box */}
            <motion.div
              variants={itemVariants}
              className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg"
            >
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Our admin team will verify your transaction as soon as possible. Once verified, you'll be able to access all features of your volunteer account.
              </p>
            </motion.div>

            {/* Submit Button */}
            <motion.button
              variants={itemVariants}
              type="submit"
              disabled={loading}
              className="w-full px-4 py-4 bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  Submitting Payment...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {isRejected ? 'Pay Again' : 'Submit Payment'}
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Steps Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 grid grid-cols-3 gap-4 text-center"
        >
          {[
            { step: "1", label: "Sign Up", done: true },
            { step: "2", label: "Email Verify", done: true },
            { step: "3", label: "Payment", done: false },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center">
              <div
                className={clsx(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white mb-2",
                  item.done ? "bg-green-500" : "bg-[#1E3A5F]"
                )}
              >
                {item.done ? "✓" : item.step}
              </div>
              <p className="text-sm text-muted">{item.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
    </div>

    <Footer />
    </>
  );
}
