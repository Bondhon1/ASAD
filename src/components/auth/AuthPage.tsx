"use client";

import React, { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { signIn, useSession, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Turnstile } from '@marsidev/react-turnstile';

type AuthMode = "login" | "signup";

const authModeVariants = {
  initial: { opacity: 0, x: 100 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 25,
    }
  },
  exit: { 
    opacity: 0, 
    x: -100,
    transition: {
      duration: 0.2,
    }
  },
};

const containerVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
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
      stiffness: 260,
      damping: 25,
    },
  },
};

function AuthPageContent() {
  const searchParams = useSearchParams();
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    // Check for OAuth errors in URL
    const oauthError = searchParams.get("error");
    if (oauthError) {
      if (oauthError === "OAuthAccountNotLinked") {
        setError("This email is already registered. Please sign in with email/password.");
      } else {
        setError("Authentication failed. Please try again.");
      }
    }
  }, [searchParams]);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleModeChange = (newMode: AuthMode) => {
    setError("");
    setSuccess("");
    setResendCooldown(0);
    setResendMessage("");
    setMode(newMode);
    setTurnstileToken('');
    setTurnstileKey(prev => prev + 1); // Reset Turnstile widget
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Verify Turnstile token
    if (!turnstileToken) {
      setError("Please complete the security verification");
      setLoading(false);
      return;
    }

    try {
      // Attempt sign in without automatic redirect so we can persist a local session flag
      const res: any = await signIn("credentials", {
        email,
        password,
        turnstileToken,
        redirect: false,
      });

      if (!res || res.error) {
        setError(res?.error || "Login failed. Please try again.");
        setLoading(false);
        // Reset Turnstile on error
        setTurnstileToken('');
        setTurnstileKey(prev => prev + 1);
        return;
      }

      // Fetch session from next-auth and persist minimal info to localStorage with TTL
      try {
        const s = await getSession();
        if (s && s.user) {
          const ttl = 7 * 24 * 60 * 60 * 1000; // 7 days
          const payload = {
            user: {
              name: s.user.name || null,
              email: s.user.email || null,
              image: s.user.image || null,
            },
            expiresAt: Date.now() + ttl,
            createdAt: Date.now(),
          };
          try { localStorage.setItem('asad_session', JSON.stringify(payload)); } catch (e) {}
        }
      } catch (e) {
        // ignore session fetch errors
      }

      // Finally redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError("Login failed. Please try again.");
      setLoading(false);
      // Reset Turnstile on error
      setTurnstileToken('');
      setTurnstileKey(prev => prev + 1);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Verify Turnstile token
    if (!turnstileToken) {
      setError("Please complete the security verification");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          turnstileToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Signup failed");
        // Reset Turnstile on error
        setTurnstileToken('');
        setTurnstileKey(prev => prev + 1);
        setLoading(false);
        return;
      }

      // Store email in localStorage for verification resend functionality
      localStorage.setItem("userEmail", email);

      setSuccess(
        "Signup successful! Please check your email for verification link."
      );
      // Start 2-minute cooldown for resend button
      setResendCooldown(120); // 2 minutes = 120 seconds
      // Reset form on success
      setEmail('');
      setPassword('');
      setTurnstileToken('');
      setTurnstileKey(prev => prev + 1);
    } catch (err) {
      setError("Signup failed. Please try again.");
      // Reset Turnstile on error
      setTurnstileToken('');
      setTurnstileKey(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleResendVerification = async () => {
    const emailToResend = localStorage.getItem("userEmail");
    if (!emailToResend) {
      setResendMessage("Email address not found. Please sign up again.");
      return;
    }

    setResendingEmail(true);
    setResendMessage("");

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToResend }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResendMessage(data.error || "Failed to resend email");
      } else {
        setResendMessage(`✓ Verification email sent! (${data.remainingAttempts} attempts remaining)`);
        setResendCooldown(120); // Reset 2-minute cooldown after successful resend
        setTimeout(() => setResendMessage(""), 5000);
      }
    } catch (err) {
      setResendMessage("Network error. Please try again.");
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>
      <style jsx>{`
        .force-visible-resend-button {
          background-color: #16a34a !important;
          color: #ffffff !important;
          font-weight: 600 !important;
          font-size: 12px !important;
          opacity: 1 !important;
          display: inline-block !important;
          visibility: visible !important;
          padding: 6px 12px !important;
          border-radius: 4px !important;
        }
        .force-visible-resend-button:disabled {
          background-color: #9ca3af !important;
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }
        .force-visible-resend-button:hover:not(:disabled) {
          background-color: #15803d !important;
        }
      `}</style>
      <Header />

    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 flex items-center justify-center p-4 md:p-8 overflow-hidden relative" style={{ paddingTop: '8rem' }}>
      {/* Decorative background elements */}
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

      <div className="relative z-10 w-full max-w-md lg:max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left side - Branding & Info (Hidden on mobile) */}
          <motion.div
            className="hidden lg:flex flex-col justify-center"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className="mb-8"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <h1 className="text-5xl font-bold text-ink mb-4">
                Join Our Community
              </h1>
              <p className="text-xl text-ink-soft mb-6">
                Amar Somoy, Amar Desh - Volunteer Management & Activity Platform
              </p>
              <div className="space-y-4">
                <motion.div
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="w-12 h-12 bg-[#1E3A5F]/10 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-[#1E3A5F]"
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
                  </div>
                  <span className="text-ink">Start volunteering and earn points</span>
                </motion.div>

                <motion.div
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="w-12 h-12 bg-[#1E3A5F]/10 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-[#1E3A5F]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10h.01M11 10h.01M7 10h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <span className="text-ink">Connect with our community</span>
                </motion.div>

                <motion.div
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="w-12 h-12 bg-[#1E3A5F]/10 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-[#1E3A5F]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <span className="text-ink">Make a real impact in society</span>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right side - Auth Forms */}
          <motion.div
            className="w-full"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className="bg-white rounded-2xl card-shadow overflow-hidden"
              variants={containerVariants}
              initial="initial"
              animate="animate"
            >
              {/* Form Header with Mode Toggle */}
              <div className="bg-gradient-to-r from-blue-900 to-indigo-800 p-8 text-white">
                <motion.div
                  className="flex gap-4 mb-6"
                  layout
                >
                  {(["login", "signup"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => handleModeChange(m)}
                      className={clsx(
                        "px-4 py-2 rounded-lg font-semibold transition-all duration-300",
                        mode === m
                          ? "bg-white text-blue-900"
                          : "text-white/70 hover:text-white"
                      )}
                    >
                      {m === "login" ? "Sign In" : "Sign Up"}
                    </button>
                  ))}
                </motion.div>
                <motion.div variants={itemVariants}>
                  <h2 className="text-2xl font-bold">
                    {mode === "login"
                      ? "Welcome Back"
                      : "Start Your Journey"}
                  </h2>
                  <p className="text-white/80 text-sm mt-1">
                    {mode === "login"
                      ? "Sign in to your account"
                      : "Join our volunteer community"}
                  </p>
                </motion.div>
              </div>

              {/* Forms Container */}
              <div className="p-8">
                {/* Error and Success Messages */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-900 rounded-lg text-sm"
                    >
                      {error}
                    </motion.div>
                  )}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm space-y-2"
                    >
                      <p>{success}</p>
                      {mode === "signup" && (
                        <div className="pt-2 border-t border-green-200">
                          <p className="text-xs text-green-600 mb-2">Didn't receive the email?</p>
                          <button
                            type="button"
                            onClick={handleResendVerification}
                            disabled={resendingEmail || resendCooldown > 0}
                            className="force-visible-resend-button text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            {resendingEmail ? "Sending..." : 
                             resendCooldown > 0 ? `Wait ${Math.floor(resendCooldown / 60)}:${(resendCooldown % 60).toString().padStart(2, '0')}` : 
                             "Resend Verification Email"}
                          </button>
                          {resendMessage && (
                            <p className={`text-xs mt-2 ${
                              resendMessage.startsWith("✓") ? "text-green-700" : "text-red-600"
                            }`}>
                              {resendMessage}
                            </p>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {mode === "login" ? (
                    <motion.form
                      key="login"
                      onSubmit={handleLogin}
                      variants={authModeVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="space-y-4"
                    >
                      <motion.div variants={itemVariants}>
                        <label className="block text-sm font-semibold text-ink mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                      </motion.div>

                      <motion.div variants={itemVariants}>
                        <label className="block text-sm font-semibold text-ink mb-2">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-4 pr-10 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-ink"
                          >
                            {showPassword ? (
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.09.178-2.137.502-3.12M6.18 6.18A9.953 9.953 0 0112 5c5.523 0 10 4.477 10 10 0 1.09-.178 2.137-.502 3.12M3 3l18 18" />
                                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        className="text-right"
                      >
                        <button
                          onClick={(e) => { e.preventDefault(); setShowForgot(true); setForgotMessage(''); }}
                          className="text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          Forgot password?
                        </button>
                      </motion.div>

                      {showForgot && (
                        <div className="p-4 bg-gray-50 rounded mt-3">
                          <div className="text-sm mb-2">Enter your account email to receive a reset link.</div>
                          <div className="flex gap-2">
                            <input value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} type="email" placeholder="your@email.com" className="flex-1 px-3 py-2 border rounded" />
                            <button disabled={forgotLoading} onClick={async () => {
                              setForgotMessage(''); setForgotLoading(true);
                              try {
                                const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: forgotEmail }) });
                                await res.json();
                                setForgotMessage('If an account exists, a reset link has been sent.');
                              } catch (e) {
                                setForgotMessage('Failed to send reset link');
                              } finally { setForgotLoading(false); }
                            }} className="px-3 py-2 bg-[#1E3A5F] text-white rounded">Send</button>
                          </div>
                          {forgotMessage && <div className="text-xs text-gray-600 mt-2">{forgotMessage}</div>}
                          <div className="text-xs mt-2">
                            <button onClick={() => setShowForgot(false)} className="text-primary">Close</button>
                          </div>
                        </div>
                      )}

                      <motion.div variants={itemVariants} className="mt-4">
                        <Turnstile
                          key={turnstileKey}
                          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                          onSuccess={(token) => setTurnstileToken(token)}
                          onError={() => setTurnstileToken('')}
                          onExpire={() => setTurnstileToken('')}
                          options={{
                            theme: 'light',
                            size: 'normal',
                          }}
                        />
                      </motion.div>

                      <motion.button
                        variants={itemVariants}
                        type="submit"
                        disabled={loading}
                        className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-lg font-semibold hover:from-blue-800 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                              }}
                              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                            />
                            Signing in...
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </motion.button>
                    </motion.form>
                  ) : (
                    <motion.form
                      key="signup"
                      onSubmit={handleSignup}
                      variants={authModeVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="space-y-4"
                    >
                      <motion.div variants={itemVariants}>
                        <label className="block text-sm font-semibold text-ink mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          required
                          className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                      </motion.div>

                      <motion.div variants={itemVariants}>
                        <label className="block text-sm font-semibold text-ink mb-2">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full px-4 pr-10 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-ink"
                          >
                            {showPassword ? (
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.09.178-2.137.502-3.12M6.18 6.18A9.953 9.953 0 0112 5c5.523 0 10 4.477 10 10 0 1.09-.178 2.137-.502 3.12M3 3l18 18" />
                                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-muted mt-1">
                          At least 8 characters, 1 uppercase, 1 number
                        </p>
                      </motion.div>

                      <motion.div variants={itemVariants} className="mt-4">
                        <Turnstile
                          key={turnstileKey}
                          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                          onSuccess={(token) => setTurnstileToken(token)}
                          onError={() => setTurnstileToken('')}
                          onExpire={() => setTurnstileToken('')}
                          options={{
                            theme: 'light',
                            size: 'normal',
                          }}
                        />
                      </motion.div>

                      <motion.button
                        variants={itemVariants}
                        type="submit"
                        disabled={loading}
                        className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-lg font-semibold hover:from-blue-800 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                              }}
                              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                            />
                            Creating account...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </motion.button>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Google Auth */}
                <motion.div
                  variants={itemVariants}
                  className="mt-6"
                >
                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-muted">Or</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                    className="w-full px-4 py-3 border border-border rounded-lg hover:bg-surface transition-all flex items-center justify-center gap-3 font-semibold text-ink"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 c0-3.331,2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.461,2.268,15.365,1,12.545,1 C6.438,1,1.514,5.921,1.514,12c0,6.079,4.924,11,11.031,11c5.787,0,10.732-4.313,11.092-9.821h-11.092V10.239z" />
                    </svg>
                    Continue with Google
                  </button>
                </motion.div>
              </div>
            </motion.div>

            {/* Footer link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 text-center text-sm text-muted"
            >
              {mode === "login" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    onClick={() => handleModeChange("signup")}
                    className="text-primary font-semibold hover:text-primary/80 transition-colors"
                  >
                    Sign up here
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => handleModeChange("login")}
                    className="text-primary font-semibold hover:text-primary/80 transition-colors"
                  >
                    Sign in here
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>

      <Footer />
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F]"></div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}
