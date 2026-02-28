"use client";

import React from "react";
import { MessageSquare } from "lucide-react";
import { useChatContext, OtherUser } from "./ChatProvider";

interface ChatWithButtonProps {
  targetUserId: string;
  targetUser?: OtherUser;
  label?: string;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}

export function ChatWithButton({
  targetUserId,
  targetUser,
  label = "Chat",
  className = "",
  variant = "secondary",
  size = "md",
}: ChatWithButtonProps) {
  const { openChat, isOfficialUser } = useChatContext();

  if (!isOfficialUser) return null;

  const baseStyles = "inline-flex items-center gap-1.5 font-semibold rounded-full transition-all shadow-sm disabled:opacity-60";

  const sizeStyles = size === "sm"
    ? "px-3 py-1 text-xs"
    : "px-5 py-2 text-sm";

  const variantStyles = {
    primary: "bg-[#1E3A5F] text-white hover:bg-[#0d2d5a]",
    secondary: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50",
    ghost: "text-[#1E3A5F] hover:bg-[#1E3A5F]/10",
  }[variant];

  return (
    <button
      onClick={() => openChat(targetUserId, targetUser)}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
    >
      <MessageSquare size={size === "sm" ? 12 : 15} />
      {label}
    </button>
  );
}
