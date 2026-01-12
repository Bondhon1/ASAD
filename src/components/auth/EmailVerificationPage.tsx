"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

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

export default function EmailVerificationPage() {
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [hasAttemptedVerification, setHasAttemptedVerification] = useState(false);

  useEffect(() => {
    // Prevent duplicate verification attempts
    if (hasAttemptedVerification) return;
    setHasAttemptedVerification(true);

    // Verify email token from URL
    const verifyEmail = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (!token) {
        setError("Invalid verification link");
        setVerifying(false);
        return;
      }

      try {
        // API call to verify email
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          throw new Error("Verification failed");
        }

        const data = await response.json();
        setEmail(data.email);
        setVerified(true);
        
        // Store email in localStorage for payment page
        localStorage.setItem("userEmail", data.email);
        
        // Redirect to initial payment page after 3 seconds
        setTimeout(() => {
          window.location.href = `/payments/initial?email=${encodeURIComponent(data.email)}`;
        }, 3000);
      } catch (err) {
        setError(
          "Email verification failed. The link may have expired."
        );
      } finally {
        setVerifying(false);
      }
    };

    verifyEmail();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
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

      <div className="relative z-10 max-w-md w-full">
        {verifying ? (
          <motion.div
            className="text-center"
            variants={containerVariants}
            initial="initial"
            animate="animate"
          >
            <motion.div
              className="mb-6 flex justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full" />
            </motion.div>
            <motion.h1 variants={itemVariants} className="text-2xl font-bold text-ink mb-2">
              Verifying Your Email
            </motion.h1>
            <motion.p variants={itemVariants} className="text-muted">
              Please wait while we verify your email address...
            </motion.p>
          </motion.div>
        ) : verified ? (
          <motion.div
            className="bg-white rounded-2xl card-shadow p-8 text-center"
            variants={containerVariants}
            initial="initial"
            animate="animate"
          >
            <motion.div
              variants={itemVariants}
              className="mb-6 flex justify-center"
            >
              <motion.div
                className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
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
              </motion.div>
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-2xl font-bold text-ink mb-2">
              Email Verified Successfully!
            </motion.h1>
            <motion.p variants={itemVariants} className="text-muted mb-6">
              Your email <span className="font-semibold">{email}</span> has been verified.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
            >
              <p className="text-sm text-blue-800">
                Next step: Complete your registration by making a payment of{" "}
                <span className="font-bold">30 BDT</span>
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="space-y-3"
            >
              <Link
                href="/payments/initial"
                className="block w-full px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-all"
              >
                Proceed to Payment
              </Link>
              <Link
                href="/auth"
                className="block w-full px-4 py-3 border border-border text-ink rounded-lg font-semibold hover:bg-surface transition-all"
              >
                Back to Sign In
              </Link>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            className="bg-white rounded-2xl card-shadow p-8 text-center"
            variants={containerVariants}
            initial="initial"
            animate="animate"
          >
            <motion.div
              variants={itemVariants}
              className="mb-6 flex justify-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-2xl font-bold text-ink mb-2">
              Verification Failed
            </motion.h1>
            <motion.p variants={itemVariants} className="text-muted mb-6">
              {error}
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="space-y-3"
            >
              <Link
                href="/auth"
                className="block w-full px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-all"
              >
                Try Again
              </Link>
              <p className="text-sm text-muted">
                Need help?{" "}
                <Link href="/contact" className="text-primary hover:text-primary/80">
                  Contact support
                </Link>
              </p>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
