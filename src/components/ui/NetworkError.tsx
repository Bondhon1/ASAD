"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCcw } from "lucide-react";

interface NetworkErrorProps {
  message?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export default function NetworkError({ 
  message = "Network error. Check your connection and try again.", 
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
        background: "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.18), transparent 35%), linear-gradient(160deg, #0b2545 0%, #11355f 48%, #1a4875 100%)",
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
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div
          style={{
            borderRadius: "20px",
            backgroundColor: "rgba(255,255,255,0.96)",
            border: "1px solid rgba(255,255,255,0.45)",
            boxShadow: "0 18px 45px rgba(0,0,0,0.28)",
            padding: "28px 22px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "74px",
              height: "74px",
              borderRadius: "50%",
              backgroundColor: "#eef2ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "18px",
            }}
          >
            <WifiOff size={34} color="#0b2545" />
          </div>

          <h2
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "#0b2545",
              marginBottom: "10px",
              textAlign: "center",
              letterSpacing: "-0.01em",
            }}
          >
            Network Error
          </h2>

          <p
            style={{
              fontSize: "14px",
              color: "#475569",
              textAlign: "center",
              lineHeight: "1.65",
              marginBottom: "22px",
            }}
          >
            {message}
          </p>

          <button
            onClick={handleRetry}
            disabled={retrying}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "12px 18px",
              backgroundColor: retrying ? "#7b8aa0" : "#0b2545",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 700,
              borderRadius: "10px",
              border: "none",
              cursor: retrying ? "not-allowed" : "pointer",
              transition: "background-color 0.2s",
            }}
          >
            <RefreshCcw
              size={16}
              style={{ animation: retrying ? "spin 1s linear infinite" : "none" }}
            />
            {retrying ? "Retrying..." : "Try Again"}
          </button>
        </div>
      </div>

      <style>{`
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
