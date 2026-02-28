"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { X, MessageSquare, Loader2 } from "lucide-react";
import { useChatContext, ConversationPreview } from "./ChatProvider";

const CHAT_TRIGGER_ATTR = "data-chat-trigger";

function UserAvatar({
  user,
  size = 40,
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
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {(user.fullName || "U").charAt(0).toUpperCase()}
    </div>
  );
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ChatList() {
  const { isListOpen, closeList, openChat, isOfficialUser, conversations, conversationsLoading: loading } =
    useChatContext();

  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click, but ignore clicks on the topbar trigger button
  useEffect(() => {
    if (!isListOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest(`[${CHAT_TRIGGER_ATTR}]`)) return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        closeList();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isListOpen, closeList]);

  if (!isListOpen || !isOfficialUser) return null;

  return (
    <>
      {/* Desktop: dropdown panel anchored below topbar */}
      <div
        ref={panelRef}
        className="fixed top-16 right-6 z-50 bg-white shadow-2xl border border-gray-200 rounded-xl overflow-hidden hidden md:flex flex-col"
        style={{ width: 320, height: 440 }}
      >
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#1E3A5F] text-white flex-shrink-0 rounded-t-xl">
          <span className="font-semibold text-sm">Messages</span>
          <button onClick={closeList} className="p-1 hover:bg-white/20 rounded">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-gray-400" size={20} />
            </div>
          )}
          {!loading && conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 px-4 text-center">
              <MessageSquare size={36} className="mb-2 opacity-40" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Visit a member's profile to start chatting</p>
            </div>
          )}
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => openChat(conv.otherUser.id, conv.otherUser)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              <div className="relative">
                <UserAvatar user={conv.otherUser} size={38} />
                {conv.hasUnread && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <p className={`text-sm truncate ${conv.hasUnread ? "font-bold text-gray-900" : "font-medium text-gray-800"}`}>
                    {conv.otherUser.fullName || "Volunteer"}
                  </p>
                  <span className="text-[10px] text-gray-400 ml-1 flex-shrink-0">
                    {formatTime(conv.lastMessageAt)}
                  </span>
                </div>
                <p className={`text-xs truncate ${conv.hasUnread ? "text-gray-700 font-medium" : "text-gray-500"}`}>
                  {conv.lastMessage?.body || "Start a conversation"}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: full-screen list */}
      <div className="fixed inset-0 z-50 bg-white flex flex-col md:hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-[#1E3A5F] text-white flex-shrink-0">
            <span className="font-semibold">Messages</span>
            <button onClick={closeList} className="p-1.5 hover:bg-white/20 rounded-lg">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="animate-spin text-gray-400" size={24} />
              </div>
            )}
            {!loading && conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center h-60 text-gray-400 px-6 text-center">
                <MessageSquare size={48} className="mb-3 opacity-40" />
                <p className="font-medium text-gray-500">No conversations yet</p>
                <p className="text-sm mt-1">Visit a member's profile to start chatting</p>
              </div>
            )}
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => openChat(conv.otherUser.id, conv.otherUser)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
              >
                <div className="relative">
                  <UserAvatar user={conv.otherUser} size={46} />
                  {conv.hasUnread && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <p className={`truncate ${conv.hasUnread ? "font-bold text-gray-900" : "font-medium text-gray-800"}`}>
                      {conv.otherUser.fullName || "Volunteer"}
                    </p>
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${conv.hasUnread ? "text-gray-700 font-medium" : "text-gray-500"}`}>
                    {conv.lastMessage?.body || "Start a conversation"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
    </>
  );
}
