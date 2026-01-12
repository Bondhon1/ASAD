"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from "react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
  userId: string;
}

export function NotificationProvider({ children, userId }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const ablyClientRef = useRef<any>(null);

  // Fetch notifications from API
  const refreshNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);

  // Mark a single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }, []);

  // Delete a notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications?id=${notificationId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setNotifications((prev) => {
          const removed = prev.find((n) => n.id === notificationId);
          if (removed && !removed.read) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
          return prev.filter((n) => n.id !== notificationId);
        });
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  }, []);

  // Initialize Ably connection with dynamic import
  useEffect(() => {
    // Guard: skip if userId is empty or undefined
    if (!userId || userId === "") return;

    let isMounted = true;

    const initAbly = async () => {
      try {
        // Dynamic import to reduce initial bundle size
        const Ably = (await import("ably")).default;
        
        if (!isMounted) return;

        const client = new Ably.Realtime({
          authCallback: async (tokenParams: any, callback: any) => {
            try {
              const res = await fetch("/api/ably/token");
              if (!res.ok) throw new Error("Failed to get token");
              const tokenRequest = await res.json();
              callback(null, tokenRequest);
            } catch (error) {
              callback(error instanceof Error ? error.message : String(error), null);
            }
          },
        });

        ablyClientRef.current = client;

        client.connection.on("connected", () => {
          if (isMounted) setIsConnected(true);
        });

        client.connection.on("disconnected", () => {
          if (isMounted) setIsConnected(false);
        });

        client.connection.on("failed", () => {
          if (isMounted) setIsConnected(false);
        });

        const channel = client.channels.get(`user-${userId}-notifications`);
        
        channel.subscribe("notification", (message: any) => {
          if (!isMounted) return;
          const newNotification: Notification = {
            ...message.data,
            read: false,
            createdAt: message.data.createdAt || new Date().toISOString(),
          };
          
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        });
      } catch (error) {
        console.error("Failed to initialize Ably:", error);
      }
    };

    // Fetch initial notifications
    refreshNotifications();
    
    // Initialize Ably after a short delay to not block initial render
    const timer = setTimeout(initAbly, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (ablyClientRef.current) {
        ablyClientRef.current.close();
        ablyClientRef.current = null;
      }
    };
  }, [userId, refreshNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
