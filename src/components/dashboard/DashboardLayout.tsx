"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

// Module-level TTL cache for scheduled interview data.
// DashboardLayout is used directly inside every dashboard page (not as a Next.js
// layout.tsx), so it re-mounts on every client-side navigation.  Without this
// cache each navigation triggers a fresh /api/user/interview request.
const _interviewCache = new Map<string, { data: any; ts: number }>();
const INTERVIEW_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
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
import NotificationDropdown from "@/components/dashboard/NotificationDropdown";

// Credit / APC icon — inline SVG that inherits currentColor
function CreditIcon({ size = 20, className = '', ...props }: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Stylized "C" with stars — APC token */}
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9.354A5 5 0 1 0 15 14.646" />
    </svg>
  );
}

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
  initialInitialPaymentStatus?: string | null;
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
  initialInitialPaymentStatus,
  topbarName,
  topbarLabel,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const [userStatus, setUserStatus] = useState<string | null>(initialUserStatus ?? null);
  const [finalPaymentStatus, setFinalPaymentStatus] = useState<string | null>(initialFinalPaymentStatus ?? null);
  const [initialPaymentStatus, setInitialPaymentStatus] = useState<string | null>(initialInitialPaymentStatus ?? null);
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

  // If the user just submitted a final payment, the payments page sets a
  // `paymentJustSubmitted` flag in sessionStorage. Respect that flag here
  // so the dashboard shows "Payment Pending Review" immediately instead
  // of prompting the user to pay again while the backend verifies the payment.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const justSubmitted = sessionStorage.getItem('paymentJustSubmitted');
      if (justSubmitted === 'true') {
        // Only set pending if we don't already know of a final payment.
        // Respect `initialFinalPaymentStatus` when available to avoid
        // showing a pending banner incorrectly when no payment exists.
        if (!initialFinalPaymentStatus || initialFinalPaymentStatus === 'REJECTED') {
          setFinalPaymentStatus('PENDING');
        }
        // clear the one-time flag in all cases
        sessionStorage.removeItem('paymentJustSubmitted');
      }
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  // Removed duplicate /api/user/profile fetch - parent pages already use useCachedUserProfile
  // If initial statuses are not provided, components will handle it themselves
  useEffect(() => {
    if (initialInitialPaymentStatus !== undefined) {
      setInitialPaymentStatus(initialInitialPaymentStatus);
    }
  }, [initialInitialPaymentStatus]);

  // Fetch scheduled interview (if any) for display on user dashboard.
  // Guards (in order):
  //  1. No email yet — nothing to look up.
  //  2. initialUserStatus is undefined — user profile hasn't loaded yet; the
  //     effect will re-run once it resolves via the userStatus dependency.
  //     Without this guard the fetch fires with userStatus=null on first render
  //     even for OFFICIAL users, because `user` is still null while loading.
  //  3. Staff roles never go through the interview pipeline.
  //  4. user is already OFFICIAL — interview banners are irrelevant.
  //  5. Module-level TTL cache — avoids re-fetching on every page navigation
  //     since DashboardLayout remounts on each client-side route change.
  useEffect(() => {
    if (!userEmail) return;
    if (initialUserStatus === undefined) return; // still loading — wait
    const staffRoles = ['HR', 'MASTER', 'ADMIN', 'DIRECTOR', 'DATABASE_DEPT', 'SECRETARIES'];
    if (staffRoles.includes(userRole)) { setScheduledInterview(null); return; }
    if (userStatus === 'OFFICIAL') { setScheduledInterview(null); return; }

    const cached = _interviewCache.get(userEmail);
    if (cached && Date.now() - cached.ts < INTERVIEW_CACHE_TTL_MS) {
      setScheduledInterview(cached.data);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/user/interview?email=${encodeURIComponent(userEmail)}`);
        if (!res.ok) {
          setScheduledInterview(null);
          return;
        }
        const data = await res.json();
        const interview = data?.interview || null;
        _interviewCache.set(userEmail, { data: interview, ts: Date.now() });
        setScheduledInterview(interview);
      } catch (e) {
        setScheduledInterview(null);
      }
    })();
  }, [userEmail, userStatus, initialUserStatus, userRole]);

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
    '/dashboard/admin/audit-logs': FileText,
    '/dashboard/admin/credit-management': CreditIcon,
    '/dashboard/admin/org-requests': Users,
  };

  const handleLogout = async () => {
    try {
      // Clear all user profile caches (v1 and v2)
      if (typeof localStorage !== 'undefined') {
        // Clear old single-key cache
        localStorage.removeItem('asad_user_profile_v1');
        
        // Clear all per-email caches (v2)
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('asad_user_profile_v2_')) {
            localStorage.removeItem(key);
          }
        });
        
        // Clear session storage
        localStorage.removeItem('asad_session');
        localStorage.removeItem('userEmail');
      }
      
      // Clear session storage flags
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
    } catch (e) {
      console.error('Error clearing cache:', e);
    }
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
      { label: "Sector/club management", href: "/dashboard/admin/org-requests" },
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
      { label: "Audit Logs", href: "/dashboard/admin/audit-logs" },
      { label: "Community", href: "/dashboard/community" },
      { label: "Settings", href: "/dashboard/settings" },
    ];

    const secretariesItems = [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Task management", href: "/dashboard/secretaries" },
      { label: "Tasks", href: "/dashboard/tasks" },
      { label: "Community", href: "/dashboard/community" },
      { label: "Settings", href: "/dashboard/settings" },
    ];

    const masterItems = [
      { label: "Dashboard", href: "/dashboard" },
      { label: "New Requests", href: "/dashboard/hr/requests" },
      { label: "Schedule Interview", href: "/dashboard/hr/interviews" },
      { label: "Approve Volunteers", href: "/dashboard/hr/approvals" },
      { label: "Audit Logs", href: "/dashboard/admin/audit-logs" },
      { label: "Job Posts", href: "/dashboard/hr/jobs" },
      { label: "Leave Management", href: "/dashboard/hr/leaves" },
      { label: "User Management", href: "/dashboard/hr/users" },
      { label: "Services", href: "/dashboard/hr/services" },
      { label: "Manage Points / Ranks", href: "/dashboard/database" },
      { label: "Credit Management", href: "/dashboard/admin/credit-management" },
      { label: "Sector/club management", href: "/dashboard/admin/org-requests" },
      { label: "Tasks", href: "/dashboard/tasks" },
      { label: "Task management", href: "/dashboard/secretaries" },
      { label: "Community", href: "/dashboard/community" },
      { label: "Settings", href: "/dashboard/settings" },
      { label: "Create Donation", href: "/dashboard/donations/create" },
    ];

    if (userRole === "MASTER") return mergeWithCommon(masterItems as any);
    if (userRole === "DIRECTOR") return mergeWithCommon(directorItems as any);
    if (userRole === "HR") {
      return mergeWithCommon(hrItems as any);
    }
    if (userRole === "ADMIN") {
      const adminItems = [
        ...hrItems.slice(0, -1), // All items except Settings
        { label: "Credit Management", href: "/dashboard/admin/credit-management" },
        { label: "Sector/club management", href: "/dashboard/admin/org-requests" },
        hrItems[hrItems.length - 1], // Settings at the end
      ];
      return mergeWithCommon(adminItems as any);
    }
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
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-blue-800">Interview Scheduled</div>
                    <div className="text-sm text-blue-700 mt-1">You have an upcoming interview on {new Date(scheduledInterview.startTime).toLocaleString()}.</div>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <a href={scheduledInterview.meetLink} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-100 rounded-md text-sm text-[#1E3A5F] hover:shadow-sm">
                        Join Google Meet
                      </a>

                      <a href={`https://wa.me/8801540388042`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 text-green-800 rounded-md text-sm hover:shadow-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className="shrink-0">
                          <path d="M20.52 3.48A11.85 11.85 0 0012 0C5.37 0 .09 5.28.09 11.91c0 2.1.55 4.07 1.6 5.82L0 24l6.44-1.67A11.9 11.9 0 0012 23.82c6.63 0 11.91-5.28 11.91-11.91 0-3.18-1.24-6.17-3.39-8.43z" fill="#25D366" />
                          <path d="M17.29 14.16c-.3-.15-1.77-.87-2.05-.97-.28-.12-.49-.15-.7.15-.2.3-.77.97-.95 1.17-.18.2-.36.22-.66.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.5-1.79-1.67-2.09-.17-.3-.02-.46.13-.61.14-.15.3-.36.45-.54.15-.18.2-.3.3-.5.1-.19.04-.36-.02-.51-.06-.15-.7-1.68-.96-2.31-.25-.61-.5-.53-.7-.54l-.6-.01c-.2 0-.51.07-.78.36-.27.29-1.03 1.01-1.03 2.46 0 1.44 1.06 2.83 1.21 3.03.15.2 2.09 3.34 5.07 4.68 2.98 1.35 2.98.9 3.52.85.54-.06 1.77-.72 2.02-1.41.25-.68.25-1.26.18-1.38-.06-.12-.24-.19-.54-.34z" fill="#FFF" />
                        </svg>
                        <div className="leading-tight">
                          <div className="text-sm font-medium">01540 388042</div>
                          <div className="text-xs text-green-700">WhatsApp</div>
                        </div>
                      </a>
                    </div>

                    <div className="mt-2 text-xs text-gray-600">If you miss the session, DM this number on WhatsApp.</div>
                  </div>

                  <div className="flex-shrink-0">
                    <a href={scheduledInterview.meetLink} target="_blank" rel="noreferrer" className="px-4 py-2 bg-[#0b2545] text-white rounded-md">Join Meet</a>
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

              {(initialPaymentStatus && initialPaymentStatus === "PENDING") && !scheduledInterview && userStatus !== "INTERVIEW_SCHEDULED" && userStatus !== "INTERVIEW_PASSED" && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-yellow-800">Initial Payment Pending</div>
                    <div className="text-sm text-yellow-700 mt-1">We've received your initial payment (30 BDT). It is pending verification by HR — you'll be notified when your application is reviewed or an interview is scheduled.</div>
                  </div>
                  
                </div>
              )}

              {userStatus === "INTERVIEW_PASSED" && (
                // If user has submitted a final payment and it's pending, show pending review message.
                // If final payment is verified or approved, don't show any banner. If no final payment, prompt to pay.
                (finalPaymentStatus === "PENDING") ? (
                    <div className="mb-4 p-4 bg-white border border-[#0b2140] rounded-md flex items-center justify-between">
                    <div>
                        <div className="font-semibold text-[#0b2140]">Payment Pending Review</div>
                        <div className="text-sm text-[#3b5166]">We've received your final payment. Admin/HR will verify it shortly.</div>
                    </div>
                    <div className="flex items-center gap-2">
                    </div>
                  </div>
                ) : (finalPaymentStatus === "VERIFIED" || finalPaymentStatus === "APPROVED") ? null : (
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

  return dashboardContent;
}
