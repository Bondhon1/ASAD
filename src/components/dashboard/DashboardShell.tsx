"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  Bell,
} from "lucide-react";
import { signOut } from "next-auth/react";
import NotificationDropdown from "@/components/dashboard/NotificationDropdown";
import { ChatProvider, useChatContext } from "@/components/chat/ChatProvider";
import { ChatList } from "@/components/chat/ChatList";
import { ChatModal } from "@/components/chat/ChatModal";
import { DashboardShellContext } from "@/components/dashboard/DashboardShellContext";

// Credit / APC icon — inline SVG that inherits currentColor
function CreditIcon({ size = 20, className = "", ...props }: any) {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9.354A5 5 0 1 0 15 14.646" />
    </svg>
  );
}

function FallbackNotificationButton() {
  return (
    <button className="p-2 rounded-lg hover:bg-gray-100 relative" disabled>
      <Bell size={20} className="text-gray-400" />
    </button>
  );
}

function ChatTopbarButton() {
  const { toggleList, unreadCount, isOfficialUser } = useChatContext();
  if (!isOfficialUser) return null;
  return (
    <button
      data-chat-trigger
      onClick={toggleList}
      className="p-2 rounded-lg hover:bg-gray-100 relative"
      title="Messages"
    >
      <MessageSquare size={20} className="text-gray-600" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center bg-blue-500 text-white text-[9px] font-bold rounded-full px-0.5 leading-none">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}

interface DashboardShellProps {
  children: React.ReactNode;
  userRole: string;
  userName: string;
  userEmail: string;
  userId: string;
  /** User status from session — used to decide if chat should be initialised */
  userStatus: string | null;
}

// Canonical icon map — same icons are used across all roles for the same href
const ICON_MAP: Record<string, any> = {
  "/dashboard": Home,
  "/dashboard/tasks": ClipboardList,
  "/dashboard/donations": DollarSign,
  "/dashboard/community": Users,
  "/dashboard/settings": Settings,
  "/dashboard/hr/requests": UserCheck,
  "/dashboard/hr/interviews": Calendar,
  "/dashboard/hr/approvals": CheckSquare,
  "/dashboard/hr/jobs": Briefcase,
  "/dashboard/hr/leaves": FileText,
  "/dashboard/hr/users": Users,
  "/dashboard/hr/services": BarChart2,
  "/dashboard/database": BarChart2,
  "/dashboard/secretaries": ClipboardList,
  "/dashboard/donations/create": DollarSign,
  "/dashboard/admin/audit-logs": FileText,
  "/dashboard/admin/credit-management": CreditIcon,
  "/dashboard/admin/org-requests": Users,
};

function formatStatusLabel(status: string | null): string {
  switch (status) {
    case "APPLICANT": return "Applicant";
    case "INTERVIEW_REQUESTED": return "Interview Requested";
    case "INTERVIEW_SCHEDULED": return "Interview Scheduled";
    case "INTERVIEW_PASSED": return "Interview Passed";
    case "FINAL_PAYMENT_REJECTED": return "Final Payment Rejected";
    case "OFFICIAL": return "Official";
    case "REJECTED": return "Rejected";
    case "INACTIVE": return "Inactive";
    case "BANNED": return "Banned";
    default: return "Volunteer";
  }
}

function getMenuItems(userRole: string) {
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

  if (userRole === "ADMIN") {
    hrItems.splice(hrItems.length - 1, 0, {
      label: "Create Donation",
      href: "/dashboard/donations/create",
    });
  }

  const directorItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "User Management", href: "/dashboard/hr/users" },
    { label: "Sector/club management", href: "/dashboard/admin/org-requests" },
    { label: "Settings", href: "/dashboard/settings" },
  ];

  const mergeWithCommon = (items: { label: string; href: string }[]) => {
    const map = new Map<string, { label: string; href: string }>();
    for (const it of items) map.set(it.href, it);
    for (const it of commonItems) {
      if (!map.has(it.href)) map.set(it.href, it);
    }
    return Array.from(map.values()).map((it) => ({
      ...it,
      icon: ICON_MAP[it.href] || Home,
    }));
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
  if (userRole === "HR") return mergeWithCommon(hrItems as any);
  if (userRole === "ADMIN") {
    const adminItems = [
      ...hrItems.slice(0, -1),
      { label: "Credit Management", href: "/dashboard/admin/credit-management" },
      { label: "Sector/club management", href: "/dashboard/admin/org-requests" },
      hrItems[hrItems.length - 1],
    ];
    return mergeWithCommon(adminItems as any);
  }
  if (userRole === "DATABASE_DEPT") return mergeWithCommon(databaseItems as any);
  if (userRole === "SECRETARIES") return mergeWithCommon(secretariesItems as any);

  return commonItems.map((it) => ({ ...it, icon: ICON_MAP[it.href] || Home }));
}

function ShellInner({
  children,
  userRole,
  userName,
  userEmail,
  userId,
  userStatus,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isStaff = ["HR", "MASTER", "ADMIN", "DIRECTOR", "DATABASE_DEPT", "SECRETARIES"].includes(
    userRole
  );
  const isUserManagementPage = pathname?.startsWith("/dashboard/hr/users");
  const displayLabel = isStaff ? userRole : formatStatusLabel(userStatus);

  let menuItems = getMenuItems(userRole);
  // Ensure Job Posts always appears last
  const jobIndex = menuItems.findIndex((it) => it.href === "/dashboard/hr/jobs");
  if (jobIndex !== -1) {
    const [jobItem] = menuItems.splice(jobIndex, 1);
    menuItems.push(jobItem);
  }

  const hasValidUserId = !!userId;

  const handleLogout = async () => {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("asad_user_profile_v1");
        Object.keys(localStorage)
          .filter((k) => k.startsWith("asad_user_profile_v2_"))
          .forEach((k) => localStorage.removeItem(k));
        localStorage.removeItem("asad_session");
        localStorage.removeItem("userEmail");
      }
      if (typeof sessionStorage !== "undefined") sessionStorage.clear();
    } catch {}
    try {
      await signOut({ redirect: false });
    } catch {}
    router.push("/auth");
  };

  return (
    <DashboardShellContext.Provider value={{ isMounted: true }}>
      <div className="min-h-screen bg-gray-50">
        {/* Topbar */}
        <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-30">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Left: Menu button + Logo */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <Link href="/" className="flex items-center gap-3 text-left">
                <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-border bg-white p-0.5 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                  <Image
                    src="/favicon.ico"
                    alt={
                      isUserManagementPage
                        ? "User management logo"
                        : "Amar Somoy Amar Desh logo"
                    }
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
              {hasValidUserId ? (
                <NotificationDropdown />
              ) : (
                <FallbackNotificationButton />
              )}
              <ChatTopbarButton />
              <div className="ml-2 px-3 py-2 bg-gray-100 rounded-lg hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500">{displayLabel}</p>
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

            {/* Logout button */}
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

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content area — offset for topbar + sidebar */}
        <div className="pt-16 lg:pl-64">{children}</div>
      </div>
      <ChatList />
      <ChatModal />
    </DashboardShellContext.Provider>
  );
}

/**
 * Persistent dashboard shell — renders the topbar, sidebar and chat UI once
 * at the route-layout level so they are NOT re-mounted on every page navigation.
 * Individual pages still use DashboardLayout for their content area + banners.
 */
export default function DashboardShell(props: DashboardShellProps) {
  return (
    <ChatProvider
      userStatus={props.userStatus ?? undefined}
      userId={props.userId}
    >
      <ShellInner {...props} />
    </ChatProvider>
  );
}
