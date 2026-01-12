"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Check, CheckCheck, Trash2, X, ExternalLink } from "lucide-react";
import { useNotifications } from "@/components/providers/NotificationProvider";

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
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, isConnected } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
    setIsOpen(false);
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

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#1E3A5F] to-[#3B5998] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={18} />
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {unreadCount} new
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
                  <CheckCheck size={16} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors sm:hidden"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`relative group ${
                      notification.read ? "bg-white" : "bg-blue-50/50"
                    }`}
                  >
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-lg">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${notification.read ? "text-gray-700" : "text-gray-900 font-medium"}`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="flex-shrink-0 w-2 h-2 mt-1.5 bg-blue-500 rounded-full" />
                          )}
                        </div>
                        {notification.message && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          {formatTimeAgo(notification.createdAt)}
                          {notification.link && (
                            <ExternalLink size={10} className="opacity-50" />
                          )}
                        </p>
                      </div>
                    </button>

                    {/* Action buttons */}
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

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
              <a
                href="/dashboard/notifications"
                className="text-xs text-[#1E3A5F] hover:underline font-medium"
                onClick={() => setIsOpen(false)}
              >
                View all notifications →
              </a>
            </div>
          )}

          {/* Connection status indicator */}
          <div className="px-4 py-1.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-400"}`} />
            <span className="text-[10px] text-gray-400">
              {isConnected ? "Live updates" : "Connecting..."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
