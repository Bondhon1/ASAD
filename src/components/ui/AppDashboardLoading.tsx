import React from 'react';

export default function AppDashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0A1929] via-[#1E3A5F] to-[#2D5F7E] px-6 py-10 text-white">
      <div className="w-full max-w-sm rounded-2xl bg-white/5 p-6 shadow-xl backdrop-blur">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/30 border-t-white" aria-hidden />
          <div className="text-sm font-medium text-white/90">Loading your dashboard...</div>
        </div>
      </div>
    </div>
  );
}
