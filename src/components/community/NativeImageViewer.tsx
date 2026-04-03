"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar } from "@capacitor/status-bar";
import { X } from "lucide-react";
import Image from "next/image";

interface NativeImageViewerProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export default function NativeImageViewer({
  images,
  initialIndex,
  onClose,
}: NativeImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    // Hide status bar for full-screen experience
    if (Capacitor.isNativePlatform()) {
      StatusBar.hide();
    }

    return () => {
      if (Capacitor.isNativePlatform()) {
        StatusBar.show();
      }
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }

    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#000",
        zIndex: 9999,
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "60px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          zIndex: 10,
        }}
      >
        <span style={{ color: "#fff", fontSize: "16px", fontWeight: 500 }}>
          {currentIndex + 1} / {images.length}
        </span>
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={24} color="#fff" />
        </button>
      </div>

      {/* Image Container */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 0",
        }}
      >
        <Image
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          fill
          style={{
            objectFit: "contain",
            padding: "60px 16px",
          }}
          unoptimized
        />
      </div>

      {/* Navigation Arrows */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrevious}
          style={{
            position: "absolute",
            left: "16px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "rgba(255,255,255,0.2)",
            border: "none",
            borderRadius: "50%",
            width: "48px",
            height: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "24px",
            color: "#fff",
            zIndex: 10,
          }}
        >
          ‹
        </button>
      )}

      {currentIndex < images.length - 1 && (
        <button
          onClick={handleNext}
          style={{
            position: "absolute",
            right: "16px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "rgba(255,255,255,0.2)",
            border: "none",
            borderRadius: "50%",
            width: "48px",
            height: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "24px",
            color: "#fff",
            zIndex: 10,
          }}
        >
          ›
        </button>
      )}

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "80px",
            background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "0 16px",
            overflowX: "auto",
            zIndex: 10,
          }}
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              style={{
                minWidth: "60px",
                height: "60px",
                border: idx === currentIndex ? "2px solid #fff" : "2px solid transparent",
                borderRadius: "4px",
                overflow: "hidden",
                cursor: "pointer",
                padding: 0,
                background: "transparent",
                position: "relative",
              }}
            >
              <Image
                src={img}
                alt={`Thumbnail ${idx + 1}`}
                fill
                style={{ objectFit: "cover" }}
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
