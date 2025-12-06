"use client";

import { motion } from "framer-motion";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-4xl font-bold text-ink mb-4">Welcome to Dashboard</h1>
        <p className="text-lg text-muted">
          Your volunteer dashboard is loading. This page will soon display your profile, tasks, and activities.
        </p>
      </motion.div>
    </div>
  );
}
