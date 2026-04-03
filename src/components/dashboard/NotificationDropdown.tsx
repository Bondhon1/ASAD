"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Check, CheckCheck, Trash2, X, ExternalLink } from "lucide-react";
import { useNotifications } from "@/components/providers/NotificationProvider";
import { useModal } from '@/components/ui/ModalProvider';

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

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, isConnected } = useNotifications();
  const { alert } = useModal();

  // Close dropdown when clicking outside (for both desktop and mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideDesktop = dropdownRef.current?.contains(target);
      const isInsideMobile = mobileRef.current?.contains(target);
      
      if (!isInsideDesktop && !isInsideMobile) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: any) => {
    // Auto-mark as read if unread
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    // If the notification points to dashboard or has no link, show full message using app alert modal
    const link = notification.link || null;
    if (!link || link === "/dashboard" || link === "dashboard") {
      alert(notification.message || "", notification.title);
      setIsOpen(false);
    } else {
      window.location.href = link;
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 relative transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} className={isConnected ? "text-gray-700" : "text-gray-400"} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Desktop Dropdown */}
      {isOpen && (
        <div ref={dropdownRef} className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50 hidden md:flex md:flex-col" style={{ maxHeight: 440 }}>
          {/* Header */}
          <div className="px-4 py-2.5 bg-[#1E3A5F] text-white flex items-center justify-between flex-shrink-0 rounded-t-xl">
            <div className="flex items-center gap-2">
              <Bell size={16} />
              <h3 className="font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck size={16} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notification List - Desktop */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`relative group ${
                      notification.read ? "bg-white" : "bg-blue-50/50"
                    }`}
                  >
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className="w-full px-3 py-2.5 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-base">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${notification.read ? "text-gray-700" : "text-gray-900 font-semibold"}`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="flex-shrink-0 w-2.5 h-2.5 mt-1 bg-blue-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                        {notification.message && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                          {formatTimeAgo(notification.createdAt)}
                          {notification.link && (
                            <ExternalLink size={10} className="opacity-50" />
                          )}
                        </p>
                      </div>
                    </button>

                    {/* Action buttons - Desktop only visible on hover */}
                    <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1">
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="p-1 bg-white rounded shadow-sm hover:bg-gray-100 transition-colors"
                          title="Mark as read"
                        >
                          <Check size={12} className="text-green-600" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-1 bg-white rounded shadow-sm hover:bg-gray-100 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={12} className="text-red-500" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer - Desktop */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex-shrink-0">
              <a
                href="/dashboard/notifications"
                className="text-xs text-[#1E3A5F] hover:underline font-medium"
                onClick={() => setIsOpen(false)}
              >
                View all notifications →
              </a>
            </div>
          )}

          {/* Connection status indicator - Desktop */}
          <div className="px-4 py-1.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-center gap-1.5 flex-shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-400"}`} />
            <span className="text-[10px] text-gray-400">
              {isConnected ? "Live updates" : "Connecting..."}
            </span>
          </div>
        </div>
      )}

      {/* Mobile: Full-screen overlay */}
      {isOpen && (
        <div ref={mobileRef} className="bg-white flex flex-col md:hidden" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
          {/* Header - Mobile */}
          <div className="flex items-center justify-between px-4 bg-[#1E3A5F] text-white flex-shrink-0" style={{ paddingTop: '3.5rem', paddingBottom: '0.75rem' }}>
            <div className="flex items-center gap-2">
              <Bell size={18} />
              <span className="font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck size={18} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Notification List - Mobile */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-gray-400 px-6 text-center">
                <Bell size={48} className="mb-3 opacity-40" />
                <p className="font-medium text-gray-500">No notifications yet</p>
                <p className="text-sm mt-1">You&apos;re all caught up!</p>
              </div>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`relative ${
                      notification.read ? "bg-white" : "bg-blue-50/50"
                    }`}
                  >
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left border-b border-gray-100"
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xl">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`${notification.read ? "text-gray-700 font-medium" : "text-gray-900 font-bold"}`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="flex-shrink-0 w-3 h-3 mt-0.5 bg-blue-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                        {notification.message && (
                          <p className={`text-sm mt-0.5 line-clamp-2 ${notification.read ? "text-gray-500" : "text-gray-700 font-medium"}`}>
                            {notification.message}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                          {formatTimeAgo(notification.createdAt)}
                          {notification.link && (
                            <ExternalLink size={11} className="opacity-50" />
                          )}
                        </p>
                      </div>
                    </button>

                    {/* Action buttons - Mobile always visible */}
                    <div className="absolute right-3 top-3 flex items-center gap-1.5">
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 active:bg-gray-100 transition-colors"
                          title="Mark as read"
                        >
                          <Check size={16} className="text-green-600" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer - Mobile */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <a
                href="/dashboard/notifications"
                className="text-sm text-[#1E3A5F] hover:underline font-medium block text-center"
                onClick={() => setIsOpen(false)}
              >
                View all notifications →
              </a>
            </div>
          )}

          {/* Connection status indicator - Mobile */}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 flex items-center justify-center gap-2 flex-shrink-0">
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-400"}`} />
            <span className="text-xs text-gray-500">
              {isConnected ? "Live updates" : "Connecting..."}
            </span>
          </div>
        </div>
      )}

      {/* using app modal via ModalProvider.alert() instead of an inline modal */}
    </div>
  );
}
