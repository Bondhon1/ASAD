"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
          className="absolute top-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl"
          animate={{ y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
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
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-4 md:p-8 relative overflow-hidden">
      {/* Decorative elements */}
      <motion.div
        className="absolute top-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl"
        animate={{ y: [0, 30, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
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
            Make a payment of <span className="font-bold text-primary">30 BDT</span> to activate your account
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
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
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
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
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
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
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
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
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
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
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
              className="w-full px-4 py-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
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
                  item.done ? "bg-green-500" : "bg-primary"
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
  );
}
