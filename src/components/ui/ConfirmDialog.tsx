"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  type?: "success" | "error" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

const getIcon = (type: string | undefined) => {
  switch (type) {
    case "success":
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case "error":
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case "warning":
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    default:
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

const getColors = (type: string | undefined) => {
  switch (type) {
    case "success":
        return {
          bg: "bg-white",
          border: "border-[#0b2140]",
          icon: "text-[#0b2140]",
          title: "text-[#0b2140]",
          message: "text-[#3b5166]",
          confirm: "bg-[#0b2140] hover:bg-[#061627]",
        };
    case "error":
        return {
          bg: "bg-white",
          border: "border-[#0b2140]",
          icon: "text-[#0b2140]",
          title: "text-[#0b2140]",
          message: "text-[#3b5166]",
          confirm: "bg-[#0b2140] hover:bg-[#061627]",
        };
    case "warning":
        return {
          bg: "bg-white",
          border: "border-[#0b2140]",
          icon: "text-[#0b2140]",
          title: "text-[#0b2140]",
          message: "text-[#3b5166]",
          confirm: "bg-[#0b2140] hover:bg-[#061627]",
        };
    default:
        return {
          bg: "bg-white",
          border: "border-[#0b2140]",
          icon: "text-[#0b2140]",
          title: "text-[#0b2140]",
          message: "text-[#3b5166]",
          confirm: "bg-[#0b2140] hover:bg-[#061627]",
        };
  }
};

export default function ConfirmDialog({ isOpen, title, message, type = "info", onConfirm, onCancel }: ConfirmDialogProps) {
  const colors = getColors(type);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", duration: 0.3 }}
            className={`w-full max-w-md ${colors.bg} ${colors.border} border rounded-lg shadow-lg p-4`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 ${colors.icon}`}>{getIcon(type)}</div>
              <div className="flex-1 min-w-0">
                {title && <h3 className={`text-sm font-semibold ${colors.title} mb-1`}>{title}</h3>}
                <p className={`text-sm ${colors.message}`}>{message}</p>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={onCancel} className="px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={onConfirm} className={`px-3 py-1.5 rounded-md text-white ${colors.confirm}`}>
                Confirm
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
