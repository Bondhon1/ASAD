"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import FlashModal from "./FlashModal";
import ConfirmDialog from "./ConfirmDialog";
import InputModal from "./InputModal";

type ToastOpts = { title?: string; type?: "success" | "error" | "warning" | "info"; autoClose?: number };

type ModalContextType = {
  toast: (message: string, opts?: ToastOpts) => void;
  alert: (message: string, title?: string, type?: ToastOpts["type"]) => Promise<void>;
  confirm: (message: string, title?: string, type?: ToastOpts["type"]) => Promise<boolean>;
  prompt: (message: string, title?: string, placeholder?: string, defaultValue?: string) => Promise<string | null>;
};

const ModalContext = createContext<ModalContextType | null>(null);

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within ModalProvider");
  return ctx;
}

export default function ModalProvider({ children }: { children: React.ReactNode }) {
  const [toastState, setToastState] = useState<{ isOpen: boolean; message: string; title?: string; type?: any; autoClose?: number } | null>(null);

  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; message: string; title?: string; type?: any; resolve?: (r: boolean) => void } | null>(null);

  const alertResolveRef = useRef<(() => void) | null>(null);
  const [inputState, setInputState] = useState<{ isOpen: boolean; title?: string; message?: string; placeholder?: string; defaultValue?: string; resolve?: (v: string | null) => void } | null>(null);

  const toast = useCallback((message: string, opts: ToastOpts = {}) => {
    setToastState({ isOpen: true, message, title: opts.title, type: opts.type, autoClose: opts.autoClose ?? 3000 });
  }, []);

  const alert = useCallback((message: string, title?: string, type?: ToastOpts["type"]) => {
    return new Promise<void>((resolve) => {
      alertResolveRef.current = () => resolve();
      setToastState({ isOpen: true, message, title, type, autoClose: 0 });
    });
  }, []);

  const confirm = useCallback((message: string, title?: string, type?: ToastOpts["type"]) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ isOpen: true, message, title, type, resolve });
    });
  }, []);

  const prompt = useCallback((message: string, title?: string, placeholder?: string, defaultValue?: string) => {
    return new Promise<string | null>((resolve) => {
      setInputState({ isOpen: true, message, title, placeholder, defaultValue, resolve });
    });
  }, []);

  const handleToastClose = useCallback(() => {
    setToastState(null);
    if (alertResolveRef.current) {
      alertResolveRef.current();
      alertResolveRef.current = null;
    }
  }, []);

  const handleConfirm = useCallback((ok: boolean) => {
    if (confirmState?.resolve) confirmState.resolve(ok);
    setConfirmState(null);
  }, [confirmState]);

  const handleInputConfirm = useCallback((value: string) => {
    if (inputState?.resolve) inputState.resolve(value);
    setInputState(null);
  }, [inputState]);

  const handleInputCancel = useCallback(() => {
    if (inputState?.resolve) inputState.resolve(null);
    setInputState(null);
  }, [inputState]);

  // override window alert/confirm on client only
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const nativeAlert = window.alert.bind(window);
    const nativeConfirm = window.confirm.bind(window);

    window.alert = (msg?: string) => {
      // show app alert (non-blocking)
      toast(String(msg ?? ""), { autoClose: 4000 });
    };

    window.confirm = (msg?: string) => {
      // show confirm and return a boolean immediately (true/false) is not possible synchronously
      // We choose to open the UI confirm and return false immediately to avoid blocking server/client code.
      // Prefer calling `confirm()` from `useModal()` in app code for proper promise-based result.
      toast(String(msg ?? ""), { autoClose: 4000 });
      return false;
    };

    return () => {
      window.alert = nativeAlert;
      window.confirm = nativeConfirm;
    };
  }, [toast]);

  const value: ModalContextType = {
    toast,
    alert,
    confirm,
    prompt,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}

      {toastState && (
        <FlashModal
          isOpen={toastState.isOpen}
          onClose={handleToastClose}
          title={toastState.title}
          message={toastState.message}
          type={toastState.type}
          autoClose={toastState.autoClose}
        />
      )}

      {confirmState && (
        <ConfirmDialog
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          type={confirmState.type}
          onConfirm={() => handleConfirm(true)}
          onCancel={() => handleConfirm(false)}
        />
      )}

      {inputState && (
        <InputModal
          isOpen={inputState.isOpen}
          title={inputState.title}
          message={inputState.message}
          placeholder={inputState.placeholder}
          defaultValue={inputState.defaultValue}
          onConfirm={(v) => handleInputConfirm(v)}
          onCancel={() => handleInputCancel()}
        />
      )}
    </ModalContext.Provider>
  );
}
