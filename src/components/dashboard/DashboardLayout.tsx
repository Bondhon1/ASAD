"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { 
  Bell, 
  MessageSquare, 
  Menu, 
  X, 
  Home,
  Users,
  ClipboardList,
  Calendar,
  DollarSign,
  Settings,
  LogOut,
  UserCheck,
  Briefcase,
  Ban,
  FileText
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole: "VOLUNTEER" | "HR" | "MASTER";
  userName: string;
  userEmail: string;
  showStatusBanners?: boolean;
  initialUserStatus?: string | null;
  initialFinalPaymentStatus?: string | null;
}

export default function DashboardLayout({
  children,
  userRole,
  userName,
  userEmail,
  showStatusBanners = true,
  initialUserStatus,
  initialFinalPaymentStatus,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const [userStatus, setUserStatus] = useState<string | null>(initialUserStatus ?? null);
  const [finalPaymentStatus, setFinalPaymentStatus] = useState<string | null>(initialFinalPaymentStatus ?? null);

  const formatStatusLabel = (status: string | null) => {
    switch (status) {
      case "APPLICANT":
        return "Applicant";
      case "INTERVIEW_REQUESTED":
        return "Interview Requested";
      case "INTERVIEW_SCHEDULED":
        return "Interview Scheduled";
      case "INTERVIEW_PASSED":
        return "Interview Passed";
      case "FINAL_PAYMENT_REJECTED":
        return "Final Payment Rejected";
      case "OFFICIAL":
        return "Official";
      case "REJECTED":
        return "Rejected";
      case "INACTIVE":
        return "Inactive";
      case "BANNED":
        return "Banned";
      default:
        return "Volunteer";
    }
  };

  useEffect(() => {
    if (initialUserStatus !== undefined) {
      setUserStatus(initialUserStatus);
    }
  }, [initialUserStatus]);

  useEffect(() => {
    if (initialFinalPaymentStatus !== undefined) {
      setFinalPaymentStatus(initialFinalPaymentStatus);
    }
  }, [initialFinalPaymentStatus]);

  useEffect(() => {
    if (!userEmail) return;
    // Fetch if status/final payment not provided or explicitly null (to hydrate from server).
    const shouldFetch =
      initialUserStatus === undefined ||
      initialUserStatus === null ||
      initialFinalPaymentStatus === undefined ||
      initialFinalPaymentStatus === null;

    if (!shouldFetch) return;
    (async () => {
      try {
        const res = await fetch(`/api/user/profile?email=${encodeURIComponent(userEmail)}`);
        const data = await res.json();
        setUserStatus(data?.user?.status || null);
        setFinalPaymentStatus(data?.user?.finalPayment?.status || null);
      } catch (e) {
        // ignore
      }
    })();
  }, [userEmail, initialFinalPaymentStatus, initialUserStatus]);

  const isStaff = userRole === "HR" || userRole === "MASTER";
  const topbarLabel = isStaff ? userRole : formatStatusLabel(userStatus);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/auth");
  };

  // Define menu items based on role
  const getMenuItems = () => {
    const commonItems = [
      { icon: Home, label: "Dashboard", href: "/dashboard" },
      { icon: ClipboardList, label: "Tasks", href: "/dashboard/tasks" },
      { icon: DollarSign, label: "Donations", href: "/dashboard/donations" },
      { icon: Users, label: "Community", href: "/dashboard/community" },
      { icon: Settings, label: "Settings", href: "/dashboard/settings" },
    ];

    const hrItems = [
      { icon: Home, label: "Dashboard", href: "/dashboard" },
      { icon: UserCheck, label: "New Requests", href: "/dashboard/hr/requests" },
      { icon: Calendar, label: "Schedule Interview", href: "/dashboard/hr/interviews" },
      { icon: Users, label: "Approve Volunteers", href: "/dashboard/hr/approvals" },
      { icon: Briefcase, label: "Job Posts", href: "/dashboard/hr/jobs" },
      { icon: FileText, label: "Leave Management", href: "/dashboard/hr/leaves" },
      { icon: Ban, label: "User Management", href: "/dashboard/hr/users" },
      { icon: Settings, label: "Settings", href: "/dashboard/settings" },
    ];

    const masterItems = [
      { icon: Home, label: "Dashboard", href: "/dashboard" },
      { icon: UserCheck, label: "New Requests", href: "/dashboard/hr/requests" },
      { icon: Calendar, label: "Schedule Interview", href: "/dashboard/hr/interviews" },
      { icon: Users, label: "Approve Volunteers", href: "/dashboard/hr/approvals" },
      { icon: Briefcase, label: "Job Posts", href: "/dashboard/hr/jobs" },
      { icon: FileText, label: "Leave Management", href: "/dashboard/hr/leaves" },
      { icon: Ban, label: "User Management", href: "/dashboard/hr/users" },
      { icon: ClipboardList, label: "Tasks", href: "/dashboard/tasks" },
      { icon: DollarSign, label: "Donations", href: "/dashboard/donations" },
      { icon: Users, label: "Community", href: "/dashboard/community" },
      { icon: Settings, label: "Settings", href: "/dashboard/settings" },
    ];

    if (userRole === "MASTER") return masterItems;
    if (userRole === "HR") return hrItems;
    return commonItems;
  };

  const menuItems = getMenuItems();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-30">
        <div className="flex items-center justify-between h-16 px-4">
          {/* Left: Menu button and Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[#1E3A5F] to-[#3B5998] rounded-lg flex items-center justify-center text-white font-bold">
                A
              </div>
              <span className="font-bold text-xl text-[#1E3A5F] hidden sm:block">ASAD</span>
            </div>
          </div>

          {/* Right: Notifications, Chat, User */}
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-gray-100 relative">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-100 relative">
              <MessageSquare size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>
            </button>
            <div className="ml-2 px-3 py-2 bg-gray-100 rounded-lg hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{userName}</p>
              <p className="text-xs text-gray-500">{topbarLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-20 transform transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-[#1E3A5F]/10 hover:text-[#1E3A5F] transition-colors"
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </a>
              );
            })}
          </nav>

          {/* Logout button at bottom */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="pt-16 lg:pl-64">
        <main className="p-6">
          {/* Rejection / payment banners */}
          {showStatusBanners && (
            <>
              {userStatus === "REJECTED" && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-red-800">Application Rejected</div>
                    <div className="text-sm text-red-700">Your application was rejected. Please re-submit the 30 BDT initial payment to retry.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href="/payments/initial" className="px-3 py-2 bg-[#1E3A5F] text-white rounded-md">Pay 30 BDT</a>
                  </div>
                </div>
              )}

              {userStatus === "INTERVIEW_PASSED" && (
                // If user has submitted a final payment and it's pending, show pending review message.
                // If final payment is verified, don't show any banner. If no final payment, prompt to pay.
                (finalPaymentStatus === "PENDING") ? (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-yellow-800">Payment Pending Review</div>
                      <div className="text-sm text-yellow-700">We've received your final payment. Admin will verify it shortly.</div>
                    </div>
                    <div className="flex items-center gap-2">
                    </div>
                  </div>
                ) : (finalPaymentStatus === "VERIFIED") ? null : (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-blue-800">Interview Passed</div>
                      <div className="text-sm text-blue-700">Congratulations — your interview passed. Please submit the 170 BDT final payment for your ID card.</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href="/payments/final" className="px-3 py-2 bg-[#1E3A5F] text-white rounded-md">Pay 170 BDT</a>
                    </div>
                  </div>
                )
              )}

              {userStatus === "FINAL_PAYMENT_REJECTED" && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-red-800">Final Payment Rejected</div>
                    <div className="text-sm text-red-700">Your final payment for the ID card was rejected. Please resubmit the 170 BDT payment.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href="/payments/final" className="px-3 py-2 bg-[#1E3A5F] text-white rounded-md">Pay 170 BDT</a>
                  </div>
                </div>
              )}
            </>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}
