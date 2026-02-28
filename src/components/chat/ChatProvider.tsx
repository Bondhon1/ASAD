"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";

export interface OtherUser {
  id: string;
  fullName: string | null;
  volunteerId: string | null;
  profilePicUrl: string | null;
  role: string;
  status?: string;
}

export interface ChatMessage {
  id: string;
  body: string;
  fromUserId: string;
  toUserId: string;
  readAt: string | null;
  createdAt: string;
  conversationId?: string;
}

export interface ConversationPreview {
  id: string;
  otherUser: OtherUser;
  lastMessage: ChatMessage | null;
  hasUnread: boolean;
  lastMessageAt: string | null;
}

interface ChatContextValue {
  isListOpen: boolean;
  openList: () => void;
  closeList: () => void;
  toggleList: () => void;
  openChat: (targetUserId: string, targetUser?: OtherUser) => void;
  closeChat: () => void;
  activeConversationId: string | null;
  activeOtherUser: OtherUser | null;
  unreadCount: number;
  refreshUnread: () => void;
  conversations: ConversationPreview[];
  conversationsLoading: boolean;
  isOfficialUser: boolean;
  /** Latest message that arrived via Ably (null until first message) */
  incomingMessage: ChatMessage | null;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}

export function ChatProvider({
  children,
  userStatus,
  userId,
}: {
  children: React.ReactNode;
  userStatus?: string;
  userId?: string;
}) {
  const [isListOpen, setIsListOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeOtherUser, setActiveOtherUser] = useState<OtherUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [incomingMessage, setIncomingMessage] = useState<ChatMessage | null>(null);
  const ablyClientRef = useRef<any>(null);
  const initDoneRef = useRef(false);
  const fetchingRef = useRef(false); // dedup in-flight fetches

  const isOfficialUser = userStatus === "OFFICIAL";
  const uid = userId;

  // Single fetch for both unread count and conversation list
  const fetchConversations = useCallback(async () => {
    if (!isOfficialUser || fetchingRef.current) return;
    fetchingRef.current = true;
    setConversationsLoading(true);
    try {
      const res = await fetch("/api/chat/conversations");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount ?? 0);
        setConversations(data.conversations ?? []);
      }
    } catch {}
    setConversationsLoading(false);
    fetchingRef.current = false;
  }, [isOfficialUser]);

  // Initialize Ably subscription on user-{uid}-chat channel
  useEffect(() => {
    if (!isOfficialUser || !uid || initDoneRef.current) return;
    initDoneRef.current = true;

    let isMounted = true;

    const init = async () => {
      try {
        const Ably = (await import("ably")).default;
        if (!isMounted) return;

        const tokenRes = await fetch("/api/ably/token", {
          headers: { "Cache-Control": "no-cache" },
        });
        if (!tokenRes.ok) return;
        const tokenRequest = await tokenRes.json();

        const client = new Ably.Realtime({
          authCallback: async (_: any, cb: any) => cb(null, tokenRequest),
        });
        ablyClientRef.current = client;

        const channel = client.channels.get(`user-${uid}-chat`);
        channel.subscribe("new-message", (msg: any) => {
          if (!isMounted) return;
          const data: ChatMessage = msg.data;

          // Increment unread only if this message is for us and not the open conversation
          if (data.toUserId === uid) {
            setActiveConversationId((activeId) => {
              if (activeId !== data.conversationId) {
                setUnreadCount((c) => c + 1);
              }
              return activeId;
            });
          }

          // Signal ChatModal with the new message
          setIncomingMessage({ ...data });
        });
      } catch (err) {
        console.error("[ChatProvider] Ably init failed:", err);
      }
    };

    fetchConversations();
    const timer = setTimeout(init, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      initDoneRef.current = false;
      if (ablyClientRef.current) {
        ablyClientRef.current.close();
        ablyClientRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOfficialUser, uid]);

  const openList = useCallback(() => {
    setIsListOpen(true);
    setActiveConversationId(null);
    setActiveOtherUser(null);
    fetchConversations();
  }, [fetchConversations]);

  const closeList = useCallback(() => {
    setIsListOpen(false);
    setActiveConversationId(null);
    setActiveOtherUser(null);
  }, []);

  const toggleList = useCallback(() => {
    setIsListOpen((prev) => {
      if (!prev) fetchConversations();
      else {
        setActiveConversationId(null);
        setActiveOtherUser(null);
      }
      return !prev;
    });
  }, [fetchConversations]);

  const openChat = useCallback(
    async (targetUserId: string, targetUser?: OtherUser) => {
      if (!isOfficialUser) return;
      try {
        const res = await fetch("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUserId }),
        });
        if (res.ok) {
          const data = await res.json();
          setActiveConversationId(data.conversationId);
          setActiveOtherUser(targetUser ?? data.otherUser ?? null);
          setIsListOpen(false); // close the list dropdown when a conversation opens
        }
      } catch {}
    },
    [isOfficialUser]
  );

  const closeChat = useCallback(() => {
    setActiveConversationId(null);
    setActiveOtherUser(null);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        isListOpen,
        openList,
        closeList,
        toggleList,
        openChat,
        closeChat,
        activeConversationId,
        activeOtherUser,
        unreadCount,
        refreshUnread: fetchConversations,
        conversations,
        conversationsLoading,
        isOfficialUser,
        incomingMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
