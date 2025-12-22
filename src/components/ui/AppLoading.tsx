import React from 'react'

export default function AppLoading() {
  return (
    <div className="min-h-[160px] flex items-center justify-center">
      <div className="flex items-center gap-3">
        <svg className="animate-spin h-6 w-6 text-[#07223f]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <div className="text-sm text-gray-600">Loading…</div>
      </div>
    </div>
  )
}
