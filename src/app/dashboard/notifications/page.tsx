"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Check, CheckCheck, Trash2, ChevronLeft, ChevronRight, Loader, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

// 2 items on mobile, 10 on desktop
const ITEMS_PER_PAGE_MOBILE = 2;
const ITEMS_PER_PAGE_DESKTOP = 10;

function getNotificationIcon(type: string): string {
  switch (type) {
    case "INTERVIEW_PASSED":
      return "🎉";
    case "INTERVIEW_REJECTED":
      return "📋";
    case "FINAL_PAYMENT_ACCEPTED":
      return "🎊";
    case "FINAL_PAYMENT_REJECTED":
      return "⚠️";
    case "INITIAL_PAYMENT_ACCEPTED":
      return "✓";
    case "INITIAL_PAYMENT_REJECTED":
      return "⚠️";
    case "NEW_TASK":
      return "📝";
    case "TASK_APPROVED":
      return "✅";
    case "TASK_REJECTED":
      return "❌";
    case "NEW_EVENT":
      return "📅";
    case "DONATION_REQUIRED":
      return "💰";
    case "RANK_UPDATE":
      return "🏆";
    case "FRIEND_REQUEST":
      return "👋";
    case "MONTHLY_PAYMENT_EXEMPT_GRANTED":
      return "🛡️";
    case "MONTHLY_PAYMENT_EXEMPT_REVOKED":
      return "🔔";
    case "POST_REPORT_NEW":
      return "🚩";
    case "POST_REPORT_STATUS":
      return "📌";
    case "POST_ACTION":
      return "⚠️";
    case "SYSTEM_ANNOUNCEMENT":
      return "📢";
    default:
      return "🔔";
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isMobile, setIsMobile] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 0,
    pageSize: ITEMS_PER_PAGE_DESKTOP,
    total: 0,
  });
  const [markingAsRead, setMarkingAsRead] = useState<Set<string>>(new Set());

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setPagination((prev) => ({
        ...prev,
        pageSize: mobile ? ITEMS_PER_PAGE_MOBILE : ITEMS_PER_PAGE_DESKTOP,
        page: 0, // Reset to first page on layout change
      }));
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch all notifications (no pagination on API, we'll paginate client-side)
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/notifications?limit=500");
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      setNotifications(data.notifications || []);

      // Calculate pagination
      let filtered = data.notifications || [];
      if (filter === "unread") {
        filtered = filtered.filter((n: Notification) => !n.read);
      }
      setPagination((prev) => ({
        ...prev,
        total: filtered.length,
        page: 0,
      }));
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Handle mark as read
  const handleMarkAsRead = async (notificationId: string, isRead: boolean) => {
    if (isRead) return; // Already read

    try {
      setMarkingAsRead((prev) => new Set(prev).add(notificationId));

      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationId: notificationId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    } finally {
      setMarkingAsRead((prev) => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }
  };

  // Handle notification click - auto mark as read and navigate if link exists
  const handleNotificationClick = async (notification: Notification) => {
    // Auto-mark as read if unread
    if (!notification.read && !markingAsRead.has(notification.id)) {
      handleMarkAsRead(notification.id, notification.read);
    }

    // Navigate to link if exists
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  // Handle delete
  const handleDelete = async (notificationId: string) => {
    try {
      // Optimistic delete
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }

      // Update pagination
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));
    } catch (err) {
      console.error("Error deleting notification:", err);
      // Revert should happen here
      fetchNotifications();
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter((n) =>
    filter === "unread" ? !n.read : true
  );

  // Paginate
  const startIdx = pagination.page * pagination.pageSize;
  const endIdx = startIdx + pagination.pageSize;
  const paginatedNotifications = filteredNotifications.slice(startIdx, endIdx);
  const totalPages = Math.ceil(filteredNotifications.length / pagination.pageSize);

  const handleNextPage = () => {
    if (pagination.page < totalPages - 1) {
      setPagination((prev) => ({ ...prev, page: prev.page + 1 }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevPage = () => {
    if (pagination.page > 0) {
      setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleGoToPage = (page: number) => {
    if (page >= 0 && page < totalPages) {
      setPagination((prev) => ({ ...prev, page }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto px-3 md:px-6 py-3 md:py-6">
      {/* Header */}
      <div className="mb-4 md:mb-8">
        <div className="flex items-center justify-between gap-2 md:gap-3 mb-1 md:mb-2">
          <div className="flex items-center gap-2 md:gap-3">
            <Bell size={isMobile ? 20 : 28} className="text-blue-600 flex-shrink-0" />
            <h1 className="text-lg md:text-3xl font-bold text-gray-900">Notifications</h1>
          </div>
          
          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFilter("all");
                setPagination((prev) => ({ ...prev, page: 0 }));
              }}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium text-xs md:text-sm transition-colors whitespace-nowrap ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => {
                setFilter("unread");
                setPagination((prev) => ({ ...prev, page: 0 }));
              }}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium text-xs md:text-sm transition-colors whitespace-nowrap ${
                filter === "unread"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>
        <p className="text-xs md:text-base text-gray-600">
          You have <strong>{unreadCount}</strong> unread notification{unreadCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-8 md:py-12">
          <Loader className="animate-spin text-blue-600 mb-2 md:mb-4" size={isMobile ? 24 : 40} />
          <p className="text-xs md:text-base text-gray-600">Loading notifications...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-6 text-center">
          <p className="text-red-700 font-medium text-xs md:text-base">Error loading notifications</p>
          <p className="text-red-600 text-xs md:text-sm">{error}</p>
          <button
            onClick={fetchNotifications}
            className="mt-2 md:mt-4 px-3 md:px-4 py-1.5 md:py-2 bg-red-600 text-white text-xs md:text-sm rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && paginatedNotifications.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-6 md:p-12 text-center">
          <Bell size={isMobile ? 32 : 48} className="text-gray-400 mx-auto mb-2 md:mb-4 opacity-50" />
          <p className="text-gray-600 text-base md:text-lg font-medium">
            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
          </p>
          <p className="text-gray-500 text-xs md:text-base">
            {filter === "unread"
              ? "You're all caught up! Check back later."
              : "When you get new updates, they will appear here."}
          </p>
        </div>
      )}

      {/* Notifications List */}
      {!loading && !error && paginatedNotifications.length > 0 && (
        <div className="space-y-2 md:space-y-3">
          {paginatedNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start gap-3 p-2 md:p-4 rounded-lg border transition-all ${
                notification.read
                  ? "bg-white border-gray-200 hover:bg-gray-50"
                  : "bg-blue-50 border-blue-200 hover:bg-blue-100"
              }`}
            >
              {/* Icon */}
              <div className="text-lg md:text-2xl flex-shrink-0 mt-0.5 md:mt-1">
                {getNotificationIcon(notification.type)}
              </div>

              {/* Content - Clickable area */}
              <div
                className="flex-grow min-w-0 cursor-pointer"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between gap-2 md:gap-4">
                  <div className="flex-grow min-w-0">
                    <h3 className="font-semibold text-gray-900 text-xs md:text-base line-clamp-1 md:line-clamp-none">
                      {notification.title}
                    </h3>
                    {notification.message && (
                      <p className="text-gray-600 text-xs md:text-sm mt-0.5 md:mt-1 line-clamp-1">
                        {notification.message}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1 md:mt-2">
                      <p className="text-gray-500 text-[10px] md:text-xs">
                        {formatDate(notification.createdAt)}
                      </p>
                      {notification.link && (
                        <ExternalLink size={10} className="text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Actions - Stop propagation to prevent triggering card click */}
                  <div
                    className="flex items-center gap-1 md:gap-2 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!notification.read && (
                      <button
                        onClick={() =>
                          handleMarkAsRead(notification.id, notification.read)
                        }
                        disabled={markingAsRead.has(notification.id)}
                        className="p-1 md:p-2 rounded-lg hover:bg-blue-200 text-blue-600 disabled:opacity-50 transition-colors"
                        title="Mark as read"
                      >
                        {markingAsRead.has(notification.id) ? (
                          <Loader size={isMobile ? 14 : 16} className="animate-spin" />
                        ) : (
                          <Check size={isMobile ? 14 : 16} />
                        )}
                      </button>
                    )}
                    {notification.read && (
                      <div className="p-1 md:p-2 text-green-600">
                        <CheckCheck size={isMobile ? 14 : 16} />
                      </div>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="p-1 md:p-2 rounded-lg hover:bg-red-200 text-gray-600 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={isMobile ? 14 : 16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading &&
        !error &&
        paginatedNotifications.length > 0 &&
        totalPages > 1 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0 mt-4 md:mt-8 pt-4 md:pt-6 border-t border-gray-200">
            <div className="text-xs md:text-sm text-gray-600 text-center md:text-left">
              Page {pagination.page + 1} of {totalPages} · Showing{" "}
              {startIdx + 1}-{Math.min(endIdx, filteredNotifications.length)} of{" "}
              {filteredNotifications.length}
            </div>

            <div className="flex gap-1 md:gap-2 flex-wrap justify-center">
              {/* Previous Button */}
              <button
                onClick={handlePrevPage}
                disabled={pagination.page === 0}
                className="flex items-center gap-1 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs md:text-sm"
              >
                <ChevronLeft size={isMobile ? 14 : 16} />
                <span className="hidden md:inline">Previous</span>
              </button>

              {/* Page Numbers - Show fewer on mobile */}
              <div className="flex gap-1">
                {isMobile
                  ? // Mobile: show current, prev, next
                    (() => {
                      const pages = [];
                      if (pagination.page > 0) {
                        pages.push(pagination.page - 1);
                      }
                      pages.push(pagination.page);
                      if (pagination.page < totalPages - 1) {
                        pages.push(pagination.page + 1);
                      }
                      return pages.map((idx) => (
                        <button
                          key={idx}
                          onClick={() => handleGoToPage(idx)}
                          className={`w-7 h-7 rounded-lg border text-xs transition-colors ${
                            pagination.page === idx
                              ? "bg-blue-600 border-blue-600 text-white font-medium"
                              : "border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ));
                    })()
                  : // Desktop: show all pages
                    Array.from({ length: totalPages }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleGoToPage(idx)}
                        className={`w-10 h-10 rounded-lg border transition-colors ${
                          pagination.page === idx
                            ? "bg-blue-600 border-blue-600 text-white font-medium"
                            : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
              </div>

              {/* Next Button */}
              <button
                onClick={handleNextPage}
                disabled={pagination.page === totalPages - 1}
                className="flex items-center gap-1 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs md:text-sm"
              >
                <span className="hidden md:inline">Next</span>
                <ChevronRight size={isMobile ? 14 : 16} />
              </button>
            </div>
          </div>
        )}

      {/* Back Link */}
      <div className="mt-4 md:mt-8">
        <Link href="/dashboard">
          <button className="text-blue-600 hover:text-blue-700 font-medium text-xs md:text-sm">
            ← Back to Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
}
