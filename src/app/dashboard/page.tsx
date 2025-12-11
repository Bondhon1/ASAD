"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

interface User {
  id: string;
  email: string;
  fullName: string | null;
  username: string | null;
  status: string;
  role: string;
  volunteerId: string | null;
  institute: { name: string } | null;
  volunteerProfile: { points: number } | null;
  initialPayment: { status: string } | null;
}

// Helper function to format status text
const formatStatus = (status: string) => {
  return status
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      // If not authenticated, redirect to auth page
      if (status === "unauthenticated") {
        router.push("/auth");
        return;
      }

      // Wait for session to load
      if (status === "loading") {
        return;
      }

      // Get email from session or localStorage (for backward compatibility)
      const userEmail = session?.user?.email || localStorage.getItem("userEmail");
      
      if (!userEmail) {
        router.push("/auth");
        return;
      }

      try {
        const response = await fetch(`/api/user/profile?email=${encodeURIComponent(userEmail)}`);
        const data = await response.json();
        
        if (data.user) {
          setUser(data.user);
          
          // Check if new Google user needs to complete payment
          if ((session as any)?.user?.needsPayment && !data.user.initialPayment) {
            // Redirect to payment page
            router.push(`/payment?email=${encodeURIComponent(userEmail)}`);
            return;
          }
        } else {
          router.push("/auth");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        router.push("/auth");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router, session, status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0A1929] via-[#1E3A5F] to-[#2D5F7E]">
        <div className="text-center">
          <motion.div
            className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full mx-auto"
            animate={{ rotate: 360 }}
            transition={{ 
              duration: 0.8, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          />
          <motion.p
            className="mt-4 text-white font-medium"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: 0.2,
              duration: 0.5,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
          >
            Loading your dashboard...
          </motion.p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout
      userRole={(user.role as "VOLUNTEER" | "HR" | "MASTER") || "VOLUNTEER"}
      userName={user.fullName || user.username || "User"}
      userEmail={user.email}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.6,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
        className="max-w-7xl mx-auto"
      >
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ 
            delay: 0.1,
            duration: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
          className="text-3xl font-bold bg-gradient-to-r from-[#1E3A5F] to-[#2D5F7E] bg-clip-text text-transparent mb-6"
        >
          Welcome back, {user.fullName || user.username}!
        </motion.h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: 0.2,
              duration: 0.5,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
            whileHover={{ 
              scale: 1.02, 
              y: -5,
              transition: { duration: 0.2 }
            }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100 font-medium">Status</p>
                <p className="text-2xl font-bold mt-1">{formatStatus(user.status)}</p>
              </div>
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <span className="text-3xl">📊</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-100 font-medium">Points</p>
                <p className="text-2xl font-bold mt-1">
                  {user.volunteerProfile?.points || 0}
                </p>
              </div>
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <span className="text-3xl">⭐</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-100 font-medium">Institute</p>
                <p className="text-lg font-semibold mt-1 line-clamp-1">
                  {user.institute?.name || "Not Set"}
                </p>
              </div>
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <span className="text-3xl">🏫</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl shadow-lg text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-100 font-medium">Role</p>
                <p className="text-2xl font-bold mt-1">{user.role}</p>
              </div>
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <span className="text-3xl">👤</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Status Messages */}
        {user.role === "VOLUNTEER" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            {user.initialPayment?.status === "PENDING" && (
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500 p-6 rounded-r-xl shadow-md">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">⏳</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-yellow-900 mb-1">
                      Payment Verification Pending
                    </h3>
                    <p className="text-yellow-800">
                      Your payment is being verified by our team. You will be
                      notified once it&apos;s approved.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {user.status === "INTERVIEW_REQUESTED" && user.initialPayment?.status !== "PENDING" && (
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500 p-6 rounded-r-xl shadow-md">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">⏳</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-yellow-900 mb-1">
                      Application Under Review
                    </h3>
                    <p className="text-yellow-800">
                      Your payment has been received. HR team will review your application and schedule an interview soon.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {user.status === "INTERVIEW_SCHEDULED" && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-6 rounded-r-xl shadow-md">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">📅</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-blue-900 mb-1">
                      Interview Scheduled
                    </h3>
                    <p className="text-blue-800">
                      Your interview is scheduled. Please check your email for
                      details.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {user.status === "OFFICIAL" && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-6 rounded-r-xl shadow-md">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">🎉</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-green-900 mb-1">
                      Welcome, Official Volunteer!
                    </h3>
                    <p className="text-green-800">
                      Congratulations! You are now an official volunteer. Your ID:{" "}
                      {user.volunteerId || "Pending"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#1E3A5F] to-[#2D5F7E] bg-clip-text text-transparent mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.a
              href="/dashboard/tasks"
              whileHover={{ 
                scale: 1.03, 
                y: -5,
                transition: { 
                  type: "spring", 
                  stiffness: 260, 
                  damping: 20 
                }
              }}
              className="bg-gradient-to-br from-white to-blue-50 p-6 rounded-xl shadow-md hover:shadow-xl border border-blue-100 cursor-pointer block"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">📋</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">My Tasks</h3>
              <p className="text-gray-600">View and manage your assigned tasks</p>
            </motion.a>

            <motion.a
              href="/dashboard/donations"
              whileHover={{ scale: 1.03, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="bg-gradient-to-br from-white to-purple-50 p-6 rounded-xl shadow-md hover:shadow-xl border border-purple-100 cursor-pointer block"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">💰</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Donations</h3>
              <p className="text-gray-600">Support our campaigns</p>
            </motion.a>

            <motion.a
              href="/dashboard/community"
              whileHover={{ scale: 1.03, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="bg-gradient-to-br from-white to-green-50 p-6 rounded-xl shadow-md hover:shadow-xl border border-green-100 cursor-pointer block"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">👥</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Community</h3>
              <p className="text-gray-600">Connect with other volunteers</p>
            </motion.a>
          </div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}

