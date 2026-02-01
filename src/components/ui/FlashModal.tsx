"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface FlashModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: "success" | "error" | "warning" | "info";
  autoClose?: number; // milliseconds, 0 = don't auto-close
}

export default function FlashModal({
  isOpen,
  onClose,
  title,
  message,
  type = "info",
  autoClose = 3000,
}: FlashModalProps) {
  useEffect(() => {
    if (isOpen && autoClose > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, onClose]);

  const getIcon = () => {
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

  const getColors = () => {
    switch (type) {
      case "success":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          icon: "text-green-600",
          title: "text-green-900",
          message: "text-green-700",
        };
      case "error":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          icon: "text-red-600",
          title: "text-red-900",
          message: "text-red-700",
        };
      case "warning":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          icon: "text-yellow-600",
          title: "text-yellow-900",
          message: "text-yellow-700",
        };
      default:
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          icon: "text-blue-600",
          title: "text-blue-900",
          message: "text-blue-700",
        };
    }
  };

  const colors = getColors();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 pointer-events-none"
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.4 }}
            className={`pointer-events-auto w-full max-w-md ${colors.bg} ${colors.border} border rounded-lg shadow-lg p-4`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 ${colors.icon}`}>
                {getIcon()}
              </div>
              <div className="flex-1 min-w-0">
                {title && (
                  <h3 className={`text-sm font-semibold ${colors.title} mb-1`}>
                    {title}
                  </h3>
                )}
                <p className={`text-sm ${colors.message}`}>
                  {message}
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
