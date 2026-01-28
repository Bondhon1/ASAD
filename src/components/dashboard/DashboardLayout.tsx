"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
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
  CheckSquare,
  BarChart2,
  Briefcase,
  FileText,
  Bell
} from "lucide-react";
import { signOut } from "next-auth/react";
import { NotificationProvider } from "@/components/providers/NotificationProvider";
import NotificationDropdown from "@/components/dashboard/NotificationDropdown";

// Fallback bell button when notifications are not available
function FallbackNotificationButton() {
  return (
    <button className="p-2 rounded-lg hover:bg-gray-100 relative" disabled>
      <Bell size={20} className="text-gray-400" />
    </button>
  );
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole: "VOLUNTEER" | "HR" | "MASTER" | "ADMIN" | "DIRECTOR" | "DATABASE_DEPT" | "SECRETARIES";
  userName: string;
  userEmail: string;
  userId: string;
  showStatusBanners?: boolean;
  initialUserStatus?: string | null;
  initialFinalPaymentStatus?: string | null;
  topbarName?: string;
  topbarLabel?: string;
}

export default function DashboardLayout({
  children,
  userRole,
  userName,
  userEmail,
  userId,
  showStatusBanners = true,
  initialUserStatus,
  initialFinalPaymentStatus,
  topbarName,
  topbarLabel,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const [userStatus, setUserStatus] = useState<string | null>(initialUserStatus ?? null);
  const [finalPaymentStatus, setFinalPaymentStatus] = useState<string | null>(initialFinalPaymentStatus ?? null);
  const [scheduledInterview, setScheduledInterview] = useState<any | null>(null);

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
    // Only fetch when parent did not provide any initial values (both undefined)
    const shouldFetch = initialUserStatus === undefined && initialFinalPaymentStatus === undefined;

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

  // Fetch scheduled interview (if any) for display on user dashboard
  useEffect(() => {
    if (!userEmail) return;
    (async () => {
      try {
        const res = await fetch(`/api/user/interview?email=${encodeURIComponent(userEmail)}`);
        if (!res.ok) return setScheduledInterview(null);
        const data = await res.json();
        setScheduledInterview(data?.interview || null);
      } catch (e) {
        setScheduledInterview(null);
      }
    })();
  }, [userEmail]);

  const isStaff = userRole === "HR" || userRole === "MASTER" || userRole === "ADMIN" || userRole === "DIRECTOR" || userRole === "DATABASE_DEPT" || userRole === "SECRETARIES";
  const displayTopbarName = topbarName ?? userName;
  const displayTopbarLabel = topbarLabel ?? (isStaff ? userRole : formatStatusLabel(userStatus));
  const pathname = usePathname();
  const isUserManagementPage = pathname?.startsWith("/dashboard/hr/users");
  // Always use the site's favicon for the compact topbar logo
  const logoSrc = "/favicon.ico";

  // Canonical icon map: ensure same icon is used for the same href across all roles
  const ICON_MAP: Record<string, any> = {
    '/dashboard': Home,
    '/dashboard/tasks': ClipboardList,
    '/dashboard/donations': DollarSign,
    '/dashboard/community': Users,
    '/dashboard/settings': Settings,
    '/dashboard/hr/requests': UserCheck,
    '/dashboard/hr/interviews': Calendar,
    '/dashboard/hr/approvals': CheckSquare,
    '/dashboard/hr/jobs': Briefcase,
    '/dashboard/hr/leaves': FileText,
    '/dashboard/hr/users': Users,
    '/dashboard/hr/services': BarChart2,
    '/dashboard/database': BarChart2,
    '/dashboard/secretaries': ClipboardList,
    '/dashboard/donations/create': DollarSign,
  };

  const handleLogout = async () => {
    try {
      // clear local stored session
      localStorage.removeItem('asad_session');
    } catch (e) {}
    // call NextAuth signOut to clear server session cookie
    try {
      await signOut({ redirect: false });
    } catch (e) {}
    router.push("/auth");
  };

  // Define menu items based on role
  const getMenuItems = () => {
    const commonItems = [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Tasks", href: "/dashboard/tasks" },
      { label: "Donations", href: "/dashboard/donations" },
      { label: "Community", href: "/dashboard/community" },
      { label: "Settings", href: "/dashboard/settings" },
    ];

    const hrItems = [
      { label: "Dashboard", href: "/dashboard" },
      { label: "New Requests", href: "/dashboard/hr/requests" },
      { label: "Schedule Interview", href: "/dashboard/hr/interviews" },
      { label: "Approve Volunteers", href: "/dashboard/hr/approvals" },
      { label: "Job Posts", href: "/dashboard/hr/jobs" },
      { label: "Leave Management", href: "/dashboard/hr/leaves" },
      { label: "User Management", href: "/dashboard/hr/users" },
      { label: "Services", href: "/dashboard/hr/services" },
      { label: "Tasks", href: "/dashboard/tasks" },
      { label: "Settings", href: "/dashboard/settings" },
    ];

    // show Create Donation for ADMIN users in the HR/admin menu
    if (userRole === "ADMIN") {
      hrItems.splice(hrItems.length - 1, 0, { label: "Create Donation", href: "/dashboard/donations/create" });
    }

    const directorItems = [
      { label: "Dashboard", href: "/dashboard" },
      { label: "User Management", href: "/dashboard/hr/users" },
      { label: "Settings", href: "/dashboard/settings" },
    ];

    // Merge role-specific items with common items, preserving role items order and avoiding duplicates by `href`.
    const mergeWithCommon = (items: { label: string; href: string }[]) => {
      const map = new Map<string, { label: string; href: string }>();
      // role-specific items first
      for (const it of items) map.set(it.href, it);
      // append common items if not already present
      for (const it of commonItems) {
        if (!map.has(it.href)) map.set(it.href, it);
      }
      // attach canonical icons before returning
      return Array.from(map.values()).map((it) => ({ ...it, icon: ICON_MAP[it.href] || Home }));
    };

    const databaseItems = [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Manage Points / Ranks", href: "/dashboard/database" },
      { label: "Community", href: "/dashboard/community" },
      { label: "Settings", href: "/dashboard/settings" },
    ];

    const secretariesItems = [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Secretaries", href: "/dashboard/secretaries" },
      { label: "Tasks", href: "/dashboard/tasks" },
      { label: "Community", href: "/dashboard/community" },
      { label: "Settings", href: "/dashboard/settings" },
    ];

    const masterItems = [
      { label: "Dashboard", href: "/dashboard" },
      { label: "New Requests", href: "/dashboard/hr/requests" },
      { label: "Schedule Interview", href: "/dashboard/hr/interviews" },
      { label: "Approve Volunteers", href: "/dashboard/hr/approvals" },
      { label: "Job Posts", href: "/dashboard/hr/jobs" },
      { label: "Leave Management", href: "/dashboard/hr/leaves" },
      { label: "User Management", href: "/dashboard/hr/users" },
      { label: "Services", href: "/dashboard/hr/services" },
      { label: "Manage Points / Ranks", href: "/dashboard/database" },
      { label: "Tasks", href: "/dashboard/tasks" },
      { label: "Secretaries", href: "/dashboard/secretaries" },
      { label: "Community", href: "/dashboard/community" },
      { label: "Settings", href: "/dashboard/settings" },
      { label: "Create Donation", href: "/dashboard/donations/create" },
    ];

    if (userRole === "MASTER") return mergeWithCommon(masterItems as any);
    if (userRole === "DIRECTOR") return mergeWithCommon(directorItems as any);
    if (userRole === "HR" || userRole === "ADMIN") return mergeWithCommon(hrItems as any);
    if (userRole === "DATABASE_DEPT") return mergeWithCommon(databaseItems as any);
    if (userRole === "SECRETARIES") return mergeWithCommon(secretariesItems as any);
    // default: attach icons to common items
    return commonItems.map((it) => ({ ...it, icon: ICON_MAP[it.href] || Home }));
  };

  let menuItems = getMenuItems();
  // Ensure Job Posts (HR jobs) appears at the bottom of the menu for all roles
  const jobHref = '/dashboard/hr/jobs';
  const jobIndex = menuItems.findIndex((it) => it.href === jobHref);
  if (jobIndex !== -1) {
    const [jobItem] = menuItems.splice(jobIndex, 1);
    menuItems.push(jobItem);
  }
  
  // Check if userId is valid for notifications
  const hasValidUserId = userId && userId !== "";

  const dashboardContent = (
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
            <Link href="/" className="flex items-center gap-3 text-left">
              <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-border bg-white p-0.5 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                <Image
                  src={logoSrc}
                  alt={isUserManagementPage ? "User management logo" : "Amar Somoy Amar Desh logo"}
                  fill
                  sizes="40px"
                  className="object-cover"
                  priority
                />
              </div>
              <div className="text-sm font-extrabold leading-tight text-[#1E3A5F] hidden sm:block">
                <span className="block">AMAR SOMOY</span>
                <span className="block text-primary">AMAR DESH</span>
              </div>
            </Link>
          </div>

          {/* Right: Notifications, Chat, User */}
          <div className="flex items-center gap-2">
            {hasValidUserId ? <NotificationDropdown /> : <FallbackNotificationButton />}
              <button className="p-2 rounded-lg hover:bg-gray-100 relative">
                <MessageSquare size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>
              </button>
              <div className="ml-2 px-3 py-2 bg-gray-100 rounded-lg hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">{displayTopbarName}</p>
                <p className="text-xs text-gray-500">{displayTopbarLabel}</p>
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
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-[#1E3A5F]/10 hover:text-[#1E3A5F] transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
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
              {userStatus === "INTERVIEW_SCHEDULED" && scheduledInterview && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-blue-800">Interview Scheduled</div>
                    <div className="text-sm text-blue-700">You have an upcoming interview on {new Date(scheduledInterview.startTime).toLocaleString()}. <a href={scheduledInterview.meetLink} target="_blank" rel="noreferrer" className="underline text-[#1E3A5F]">Join Meet</a></div>
                  </div>
                </div>
              )}
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

  // Wrap with NotificationProvider only if we have a valid userId
  if (hasValidUserId) {
    return (
      <NotificationProvider userId={userId}>
        {dashboardContent}
      </NotificationProvider>
    );
  }

  return dashboardContent;
}
