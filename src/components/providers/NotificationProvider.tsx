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
  const hasFetchedRef = useRef(false);

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

        // Fetch a token request first to know the server-side clientId we should subscribe to
        const tokenRes = await fetch("/api/ably/token", {
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (!tokenRes.ok) {
          console.error('Failed to fetch Ably token request');
          return;
        }
        const tokenRequest = await tokenRes.json();

        const client = new Ably.Realtime({
          authCallback: async (_tokenParams: any, callback: any) => {
            // Return the previously fetched token request to Ably SDK
            callback(null, tokenRequest);
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

        // Use the clientId supplied in the token request to subscribe to the correct channel
        const tokenClientId = tokenRequest.clientId || tokenRequest.clientId === 0 ? tokenRequest.clientId : null;
        const subscribeChannelId = tokenClientId ? `user-${tokenClientId}-notifications` : `user-${userId}-notifications`;
        const channel = client.channels.get(subscribeChannelId);
        
        channel.subscribe("notification", (message: any) => {
          if (!isMounted) return;
          const newNotification: Notification = {
            ...message.data,
            read: false,
            createdAt: message.data.createdAt || new Date().toISOString(),
          };
          
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
          // Dispatch a global window event so other parts of the app can react
          try {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('asad:notification', { detail: message.data }));
            }
          } catch (e) {
            // ignore
          }
        });
      } catch (error) {
        console.error("Failed to initialize Ably:", error);
      }
    };

    // Fetch initial notifications only once
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      refreshNotifications();
    }
    
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
  }, [userId]); // Removed refreshNotifications from deps to prevent infinite loop

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
