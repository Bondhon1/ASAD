"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

export default function ImageViewerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const imagesParam = searchParams.get("images");
    const indexParam = searchParams.get("index");
    
    if (imagesParam) {
      try {
        const parsedImages = JSON.parse(decodeURIComponent(imagesParam));
        setImages(parsedImages);
        setCurrentIndex(indexParam ? parseInt(indexParam) : 0);
      } catch (e) {
        console.error("Failed to parse images:", e);
        router.back();
      }
    }
  }, [searchParams, router]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : prev));
  };

  const handleClose = () => {
    router.back();
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div 
      className="bg-black flex flex-col"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 bg-black/90 backdrop-blur-sm flex-shrink-0" style={{ paddingTop: '3.5rem', paddingBottom: '1rem' }}>
        <button 
          onClick={handleClose}
          className="p-2 rounded-full hover:bg-white/10 text-white flex items-center gap-2"
        >
          <ArrowLeft size={24} />
        </button>
        <span className="text-white text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </span>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      {/* Image Container */}
      <div className="flex-1 flex items-center justify-center relative px-4">
        <div className="relative w-full" style={{ height: 'calc(100vh - 180px)' }}>
          <Image
            src={images[currentIndex]}
            alt={`Image ${currentIndex + 1}`}
            fill
            className="object-contain"
            sizes="100vw"
            priority
            unoptimized
          />
        </div>

        {/* Navigation Buttons */}
        {currentIndex > 0 && (
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-3 hover:bg-black/70 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft size={28} />
          </button>
        )}
        
        {currentIndex < images.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-3 hover:bg-black/70 transition-colors"
            aria-label="Next"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      {/* Thumbnail Strip (optional, for better UX) */}
      {images.length > 1 && (
        <div className="bg-black/90 backdrop-blur-sm px-4 py-3 overflow-x-auto flex gap-2 flex-shrink-0">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                idx === currentIndex ? "border-white scale-110" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <Image
                src={img}
                alt={`Thumbnail ${idx + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
