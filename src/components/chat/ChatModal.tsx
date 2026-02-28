"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import Image from "next/image";
import { X, ArrowLeft, Send, Loader2 } from "lucide-react";
import { useChatContext, ChatMessage } from "./ChatProvider";

function UserAvatar({
  user,
  size = 32,
}: {
  user: { fullName?: string | null; profilePicUrl?: string | null };
  size?: number;
}) {
  if (user.profilePicUrl) {
    return (
      <Image
        src={user.profilePicUrl}
        alt={user.fullName || "User"}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-[#1E3A5F] text-white flex items-center justify-center font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {(user.fullName || "U").charAt(0).toUpperCase()}
    </div>
  );
}

function formatMsgTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatRole(role: string) {
  return role.replace(/_/g, " ");
}

export function ChatModal() {
  const {
    activeConversationId,
    activeOtherUser,
    closeChat,
    refreshUnread,
    isOfficialUser,
    incomingMessage,
  } = useChatContext();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const oldestMsgRef = useRef<string | null>(null);

  const fetchMessages = useCallback(
    async (conversationId: string, after?: string) => {
      try {
        const url = after
          ? `/api/chat/${conversationId}/messages?after=${encodeURIComponent(after)}&limit=50`
          : `/api/chat/${conversationId}/messages?limit=40`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        setMyId(data.myId);
        setHasMore(data.hasMore ?? false);
        if (after) {
          // New messages - append
          const newMsgs: ChatMessage[] = data.messages ?? [];
          if (newMsgs.length > 0) {
            setMessages((prev) => {
              const ids = new Set(prev.map((m) => m.id));
              return [...prev, ...newMsgs.filter((m) => !ids.has(m.id))];
            });
            refreshUnread();
          }
        } else {
          setMessages(data.messages ?? []);
          oldestMsgRef.current = data.messages?.[0]?.createdAt ?? null;
        }
      } catch {}
    },
    [refreshUnread]
  );

  const loadOlder = useCallback(async () => {
    if (!activeConversationId || !oldestMsgRef.current) return;
    setLoadingMsgs(true);
    try {
      const res = await fetch(
        `/api/chat/${activeConversationId}/messages?before=${encodeURIComponent(oldestMsgRef.current)}&limit=30`
      );
      if (!res.ok) return;
      const data = await res.json();
      const older: ChatMessage[] = data.messages ?? [];
      if (older.length > 0) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          return [...older.filter((m) => !ids.has(m.id)), ...prev];
        });
        oldestMsgRef.current = older[0].createdAt;
        setHasMore(data.hasMore ?? false);
      } else {
        setHasMore(false);
      }
    } catch {}
    setLoadingMsgs(false);
  }, [activeConversationId]);

  // Load initial messages on conversation open (GET also marks messages read on server)
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      setMyId(null);
      return;
    }
    setLoadingMsgs(true);
    fetchMessages(activeConversationId).finally(() => {
      setLoadingMsgs(false);
      refreshUnread(); // sync unread badge after server marks messages read
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  // Receive real-time messages from Ably via ChatProvider
  useEffect(() => {
    if (!incomingMessage || incomingMessage.conversationId !== activeConversationId) return;
    setMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      if (ids.has(incomingMessage.id)) return prev;
      return [...prev, incomingMessage];
    });
    if (incomingMessage.toUserId === myId) {
      refreshUnread();
    }
  }, [incomingMessage]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !activeConversationId || sending) return;
    setSending(true);
    setText("");
    try {
      const res = await fetch(`/api/chat/${activeConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          if (ids.has(data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    } catch {}
    setSending(false);
  };

  if (!activeConversationId || !activeOtherUser || !isOfficialUser) return null;

  return (
    <>
      {/* Desktop: floating panel at bottom-right */}
      <div className="fixed bottom-0 right-6 z-50 w-80 hidden md:flex flex-col rounded-t-xl shadow-2xl border border-gray-200 bg-white overflow-hidden"
        style={{ height: 420 }}>
        {/* Header */}
        <div className="flex items-center gap-2 bg-[#1E3A5F] text-white px-3 py-2.5 flex-shrink-0">
          <UserAvatar user={activeOtherUser} size={32} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">
              {activeOtherUser.fullName || "Volunteer"}
            </p>
            <p className="text-xs opacity-75 truncate leading-tight">
              {formatRole(activeOtherUser.role)}
              {activeOtherUser.volunteerId && (
                <span className="ml-1 font-mono">#{activeOtherUser.volunteerId}</span>
              )}
            </p>
          </div>
          <button onClick={closeChat} className="p-1 hover:bg-white/20 rounded">
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 bg-gray-50">
          {hasMore && (
            <button
              onClick={loadOlder}
              disabled={loadingMsgs}
              className="w-full text-center text-xs text-[#1E3A5F] py-1 hover:underline"
            >
              {loadingMsgs ? <Loader2 size={12} className="inline animate-spin" /> : "Load older"}
            </button>
          )}
          {messages.map((msg) => {
            const isMe = msg.fromUserId === myId;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[70%] px-3 py-1.5 rounded-2xl text-sm break-words ${
                    isMe
                      ? "bg-[#1E3A5F] text-white rounded-br-sm"
                      : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
                  }`}
                >
                  {msg.body}
                  <div className={`text-[10px] mt-0.5 ${isMe ? "text-blue-200" : "text-gray-400"} text-right`}>
                    {formatMsgTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && !loadingMsgs && (
            <p className="text-center text-xs text-gray-400 mt-8">
              No messages yet. Say hello!
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-200 bg-white flex-shrink-0">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            maxLength={1000}
            className="flex-1 text-sm border border-gray-200 rounded-full px-3 py-1.5 focus:outline-none focus:border-[#1E3A5F]"
            autoFocus
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="p-1.5 bg-[#1E3A5F] text-white rounded-full disabled:opacity-40 hover:bg-[#0d2d5a] transition-colors"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </form>
      </div>

      {/* Mobile: full-screen modal */}
      <div className="fixed inset-0 z-50 bg-white flex flex-col md:hidden">
        {/* Header */}
        <div className="flex items-center gap-3 bg-[#1E3A5F] text-white px-4 py-3 flex-shrink-0 safe-area-top">
          <button onClick={closeChat} className="p-1.5 hover:bg-white/20 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <UserAvatar user={activeOtherUser} size={38} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{activeOtherUser.fullName || "Volunteer"}</p>
            <p className="text-xs opacity-75">
              {formatRole(activeOtherUser.role)}
              {activeOtherUser.volunteerId && (
                <span className="ml-1 font-mono">#{activeOtherUser.volunteerId}</span>
              )}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 bg-gray-50">
          {hasMore && (
            <button
              onClick={loadOlder}
              disabled={loadingMsgs}
              className="w-full text-center text-xs text-[#1E3A5F] py-2 hover:underline"
            >
              {loadingMsgs ? <Loader2 size={14} className="inline animate-spin" /> : "Load older messages"}
            </button>
          )}
          {messages.map((msg) => {
            const isMe = msg.fromUserId === myId;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm break-words ${
                    isMe
                      ? "bg-[#1E3A5F] text-white rounded-br-sm"
                      : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
                  }`}
                >
                  {msg.body}
                  <div className={`text-[10px] mt-0.5 ${isMe ? "text-blue-200" : "text-gray-400"} text-right`}>
                    {formatMsgTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && !loadingMsgs && (
            <p className="text-center text-sm text-gray-400 mt-12">
              No messages yet. Say hello! 👋
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0 safe-area-bottom"
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            maxLength={1000}
            className="flex-1 text-sm border border-gray-200 rounded-full px-4 py-2.5 focus:outline-none focus:border-[#1E3A5F]"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="p-2.5 bg-[#1E3A5F] text-white rounded-full disabled:opacity-40 hover:bg-[#0d2d5a]"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </>
  );
}
