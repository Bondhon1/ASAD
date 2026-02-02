"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface InputModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function InputModal({ isOpen, title, message, placeholder, defaultValue = "", onConfirm, onCancel }: InputModalProps) {
  const [value, setValue] = useState(defaultValue);

  React.useEffect(() => {
    if (isOpen) setValue(defaultValue);
  }, [isOpen, defaultValue]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ type: 'spring', duration: 0.25 }} className="w-full max-w-md bg-white rounded-lg shadow-lg p-4">
            {title && <h3 className="text-sm font-semibold text-[#0b2140] mb-2">{title}</h3>}
            {message && <p className="text-sm text-[#3b5166] mb-3">{message}</p>}
            <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="w-full p-2 border border-[#0b2140] rounded mb-3 focus:outline-none focus:ring-2 focus:ring-[#0b2140]/20" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { onCancel(); }} className="px-3 py-1.5 border border-[#0b2140] text-[#0b2140] rounded hover:bg-[#f8fafc]">Cancel</button>
              <button onClick={() => onConfirm(value)} className="px-3 py-1.5 bg-[#0b2140] hover:bg-[#061627] text-white rounded">OK</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
