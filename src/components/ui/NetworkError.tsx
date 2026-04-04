"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCcw, AlertCircle } from "lucide-react";

interface NetworkErrorProps {
  message?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export default function NetworkError({ 
  message = "Network connection lost. Please check your internet and try again.", 
  onRetry,
  fullScreen = true 
}: NetworkErrorProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (onRetry) {
      setRetrying(true);
      try {
        await onRetry();
      } finally {
        setTimeout(() => setRetrying(false), 500);
      }
    } else {
      // Default retry: reload the page
      window.location.reload();
    }
  };

  const containerStyle = fullScreen
    ? {
        position: "fixed" as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#ffffff",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }
    : {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        backgroundColor: "#f8fafc",
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
      };

  return (
    <div style={containerStyle}>
      {/* Error Icon with Animation */}
      <div
        style={{
          position: "relative",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            backgroundColor: "#fee2e2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        >
          <WifiOff size={40} color="#dc2626" />
        </div>
      </div>

      {/* Error Title */}
      <h2
        style={{
          fontSize: "20px",
          fontWeight: 700,
          color: "#1e293b",
          marginBottom: "12px",
          textAlign: "center",
        }}
      >
        Connection Lost
      </h2>

      {/* Error Message */}
      <p
        style={{
          fontSize: "14px",
          color: "#64748b",
          textAlign: "center",
          maxWidth: "400px",
          lineHeight: "1.6",
          marginBottom: "24px",
        }}
      >
        {message}
      </p>

      {/* Retry Button */}
      <button
        onClick={handleRetry}
        disabled={retrying}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 24px",
          backgroundColor: retrying ? "#94a3b8" : "#0b2545",
          color: "#ffffff",
          fontSize: "14px",
          fontWeight: 600,
          borderRadius: "8px",
          border: "none",
          cursor: retrying ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
        onMouseEnter={(e) => {
          if (!retrying) {
            e.currentTarget.style.backgroundColor = "#0d2d5a";
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.15)";
          }
        }}
        onMouseLeave={(e) => {
          if (!retrying) {
            e.currentTarget.style.backgroundColor = "#0b2545";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
          }
        }}
      >
        <RefreshCcw
          size={16}
          style={{
            animation: retrying ? "spin 1s linear infinite" : "none",
          }}
        />
        {retrying ? "Retrying..." : "Try Again"}
      </button>

      {/* Connection Tips */}
      {fullScreen && (
        <div
          style={{
            marginTop: "32px",
            padding: "16px",
            backgroundColor: "#eff6ff",
            borderRadius: "12px",
            border: "1px solid #dbeafe",
            maxWidth: "400px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <AlertCircle size={18} color="#3b82f6" style={{ marginTop: "2px", flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#1e40af", marginBottom: "8px" }}>
                Connection Tips:
              </p>
              <ul
                style={{
                  fontSize: "12px",
                  color: "#1e3a8a",
                  lineHeight: "1.6",
                  paddingLeft: "16px",
                  margin: 0,
                }}
              >
                <li>Check your WiFi or mobile data connection</li>
                <li>Make sure airplane mode is off</li>
                <li>Try moving to an area with better signal</li>
                <li>Restart your router if using WiFi</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
