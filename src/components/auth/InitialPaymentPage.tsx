"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";

type PaymentMethod = "bkash" | "nagad" | "visa" | "mastercard";

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
    dummyNumber: "01730123456",
    description: "Digital wallet service",
  },
  {
    id: "nagad",
    name: "Nagad",
    icon: "📱",
    dummyNumber: "01829123456",
    description: "Mobile banking service",
  },
  {
    id: "visa",
    name: "Visa",
    icon: "💳",
    dummyNumber: "4111 1111 1111 1111",
    description: "Credit/Debit card",
  },
  {
    id: "mastercard",
    name: "Mastercard",
    icon: "💳",
    dummyNumber: "5555 5555 5555 4444",
    description: "Credit/Debit card",
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentMethod = paymentMethods.find((m) => m.id === selectedMethod)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!senderNumber || !trxId || !paymentDate || !paymentTime) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/payments/initial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: selectedMethod,
          senderNumber,
          trxId,
          paymentDate,
          paymentTime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Payment submission failed");
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
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
              <Link href="/auth" className="rounded-lg bg-[#1E3A5F] px-7 py-3 text-sm font-semibold text-white hover:bg-[#2a4d75] transition-all duration-300">Join Now</Link>
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
            <Link href="/auth" onClick={() => setMobileMenuOpen(false)} className="rounded-lg bg-[#1E3A5F] px-7 py-3 text-center text-sm font-semibold text-white transition-all duration-300">Join Now</Link>
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

            {/* Payment Method Selection */}
            <motion.div variants={itemVariants} className="mb-8">
              <label className="block text-lg font-semibold text-ink mb-4">
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
                Send payment to this {currentMethod.name} number:
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
              />
              <p className="text-xs text-muted mt-1">
                Usually found in your transaction receipt or SMS confirmation
              </p>
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
                />
              </div>
            </motion.div>

            {/* Info Box */}
            <motion.div
              variants={itemVariants}
              className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg"
            >
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Our admin team will verify your transaction within 24 hours. Once verified, you'll be able to access all features of your volunteer account.
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
                  Submit Payment
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

      {/* Footer */}
      <footer className="bg-[#1E3A5F] px-6 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 md:grid-cols-3">
            <div>
              <h3 className="text-2xl font-bold">ASAD</h3>
              <p className="mt-1 text-[#4A90D9] font-semibold">Amar Somoy Amar Desh</p>
              <p className="mt-4 text-white/60">Building a stronger Bangladesh through dedicated youth volunteerism.</p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#4A90D9]">Explore</h4>
              <div className="mt-6 flex flex-col gap-3 text-white/60">
                <Link href="/" className="hover:text-white transition-colors duration-300">Home</Link>
                <Link href="/" className="hover:text-white transition-colors duration-300">About Us</Link>
                <Link href="/" className="hover:text-white transition-colors duration-300">Sectors</Link>
                <Link href="/auth" className="hover:text-white transition-colors duration-300">Join Us</Link>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#4A90D9]">Contact</h4>
              <div className="mt-6 space-y-3 text-white/60">
                <p>FB: Asadian Asad</p>
                <p>hello@asadofficial.org</p>
              </div>
            </div>
          </div>
          <div className="mt-16 border-t border-white/10 pt-8 text-center text-sm text-white/40">
            © {new Date().getFullYear()} Amar Somoy Amar Desh. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
