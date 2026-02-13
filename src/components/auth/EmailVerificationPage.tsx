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
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState("");
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [cooldownTime, setCooldownTime] = useState<number | null>(null);
  const [alreadyVerified, setAlreadyVerified] = useState(false);

  const scheduleRedirect = (targetEmail: string) => {
    setTimeout(() => {
      window.location.href = `/payments/initial?email=${encodeURIComponent(targetEmail)}`;
    }, 3000);
  };

  const handleResendVerification = async () => {
    if (!email && typeof window !== 'undefined') {
      const storedEmail = localStorage.getItem("userEmail");
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }

    const emailToUse = email || (typeof window !== 'undefined' ? localStorage.getItem("userEmail") : null);
    
    if (!emailToUse) {
      setResendError("Email address not found. Please sign up again.");
      return;
    }

    setResending(true);
    setResendError("");
    setResendSuccess(false);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToUse }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.cooldown && data.remainingTime) {
          setCooldownTime(data.remainingTime);
          setResendError(data.error);
        } else if (data.maxLimitReached) {
          setResendError(data.error);
          setRemainingAttempts(0);
        } else {
          setResendError(data.error || "Failed to resend verification email");
        }
      } else {
        setResendSuccess(true);
        setRemainingAttempts(data.remainingAttempts);
        setTimeout(() => setResendSuccess(false), 5000);
      }
    } catch (err) {
      console.error("Resend error:", err);
      setResendError("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let redirectTimer: NodeJS.Timeout | null = null;

    // Verify email token from URL
    const verifyEmail = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (!token) {
        setError("Invalid verification link");
        setVerifying(false);
        return;
      }

      // Guard against duplicate requests (e.g., React Strict Mode double mount)
      const verificationKey = `emailVerification:${token}`;
      const storedEmail = localStorage.getItem("userEmail");

      const existingState = sessionStorage.getItem(verificationKey);
      if (existingState === "true" && storedEmail) {
        if (!cancelled) {
          setEmail(storedEmail);
          setVerified(true);
          setVerifying(false);
          redirectTimer = setTimeout(() => {
            if (!cancelled) {
              window.location.href = `/payments/initial?email=${encodeURIComponent(storedEmail)}`;
            }
          }, 3000);
        }
        return;
      }

      // If another instance is currently verifying, skip sending a duplicate request.
      if (existingState === "in-progress") {
        if (!cancelled) {
          setVerifying(false);
        }
        return;
      }

      try {
        // Mark verification in-progress to avoid duplicate requests
        sessionStorage.setItem(verificationKey, "in-progress");

        // API call to verify email
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          if (cancelled) return;
          
          // Remove in-progress marker so user can retry
          try {
            sessionStorage.removeItem(verificationKey);
          } catch (e) {}

          // Check if it's an "already verified" error
          if (data.error && data.error.toLowerCase().includes("already verified")) {
            setAlreadyVerified(true);
            setError("Email is already verified");
            setVerifying(false);
            
            // Redirect to auth page after 2 seconds
            redirectTimer = setTimeout(() => {
              if (!cancelled) {
                window.location.href = "/auth";
              }
            }, 2000);
            return;
          } else {
            setError(data.error || "Email verification failed. The link may have expired.");
          }
          setVerifying(false);
          return;
        }

        if (cancelled) return;
        
        setEmail(data.email);
        setVerified(true);
        sessionStorage.setItem(verificationKey, "true");

        // Store email in localStorage for payment page
        localStorage.setItem("userEmail", data.email);
        
        // Redirect to initial payment page after 3 seconds
        redirectTimer = setTimeout(() => {
          if (!cancelled) {
            window.location.href = `/payments/initial?email=${encodeURIComponent(data.email)}`;
          }
        }, 3000);
      } catch (err: any) {
        if (cancelled) return;
        
        // Remove in-progress marker so user can retry
        try {
          sessionStorage.removeItem(verificationKey);
        } catch (e) {}

        // Network or other errors
        setError("Email verification failed. The link may have expired.");
      } finally {
        if (!cancelled) {
          setVerifying(false);
        }
      }
    };

    verifyEmail();

    return () => {
      cancelled = true;
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
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
                className="block w-full px-3 py-2 bg-[#1E3A5F] text-white rounded-lg font-semibold hover:bg-[#152d47] transition-all shadow-sm text-center text-sm"
              >
                Proceed to Payment
              </Link>
              <Link
                href="/auth"
                className="block w-full px-3 py-2 bg-gray-200 text-ink rounded-lg font-semibold text-center shadow-sm hover:bg-gray-300 transition-all border border-gray-400 text-sm"
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
              {alreadyVerified ? "Email Already Verified" : "Verification Failed"}
            </motion.h1>
            <motion.p variants={itemVariants} className="text-muted mb-6">
              {alreadyVerified ? "Your email is already verified. Redirecting to sign in..." : error}
            </motion.p>

            {resendSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <p className="text-sm text-green-800">
                  ✓ Verification email sent! Please check your inbox.
                  {remainingAttempts !== null && remainingAttempts > 0 && (
                    <span className="block mt-1 text-xs">
                      {remainingAttempts} resend attempt(s) remaining.
                    </span>
                  )}
                </p>
              </motion.div>
            )}

            {resendError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <p className="text-sm text-red-800">{resendError}</p>
                {cooldownTime && (
                  <p className="text-xs text-red-600 mt-1">
                    Please wait {cooldownTime} minute(s) before trying again.
                  </p>
                )}
              </motion.div>
            )}

            <motion.div
              variants={itemVariants}
              className="space-y-3"
            >
              {!alreadyVerified && remainingAttempts !== 0 && !cooldownTime && (
                <motion.button
                  variants={itemVariants}
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="block w-full px-3 py-2 bg-[#1E3A5F] text-white rounded-lg font-semibold hover:bg-[#152d47] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
                >
                  {resending ? "Sending..." : "Resend Verification Email"}
                </motion.button>
              )}
              <motion.div variants={itemVariants}>
                <Link
                  href="/auth"
                  className="block w-full px-3 py-2 bg-gray-200 text-ink rounded-lg font-semibold text-center shadow-sm hover:bg-gray-300 transition-all border border-gray-400 text-sm"
                >
                  {alreadyVerified ? "Go to Sign In" : remainingAttempts === 0 ? "Contact Support" : "Back to Sign In"}
                </Link>
              </motion.div>
              <motion.p variants={itemVariants} className="text-sm text-gray-600">
                Need help?{" "}
                <Link href="/contact" className="text-[#1E3A5F] hover:text-[#152d47] underline font-semibold">
                  Contact support
                </Link>
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
