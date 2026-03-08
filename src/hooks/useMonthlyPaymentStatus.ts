"use client";

import { useState, useEffect, useCallback } from "react";

export interface MonthSummary {
  month: number;
  year: number;
  monthName: string;
  amount: number;
  fine: number;
  deadlineDay: number;
  bkashNumber: string | null;
  nagadNumber: string | null;
  isLate: boolean;
  fineApplies: boolean;
  dueAmount: number;
  isPaid: boolean;
  isPending: boolean;
  isRejected: boolean;
  isUnpaid: boolean;
  payment: Record<string, unknown> | null;
  delayRequest: { status: string; reason: string } | null;
  delayApproved: boolean;
}

export interface MonthlyPaymentStatusData {
  today: { month: number; year: number; day: number };
  isDonationMonth: boolean;
  currentMonthSummary: MonthSummary | null;
  unpaidMonths: MonthSummary[];
  unpaidCount: number;
  monthSummaries: MonthSummary[];
}

// ── Module-level dedup cache ──────────────────────────────────────────────────
let _cache: MonthlyPaymentStatusData | null = null;
let _promise: Promise<MonthlyPaymentStatusData> | null = null;
const _subscribers = new Set<(data: MonthlyPaymentStatusData) => void>();

function fetchOnce(): Promise<MonthlyPaymentStatusData> {
  if (_cache) return Promise.resolve(_cache);
  if (_promise) return _promise;
  _promise = fetch("/api/monthly-payments/status")
    .then((r) => r.json())
    .then((data: MonthlyPaymentStatusData) => {
      _cache = data;
      _promise = null;
      // Notify all other mounted instances
      _subscribers.forEach((cb) => cb(data));
      return data;
    })
    .catch((err) => {
      _promise = null;
      throw err;
    });
  return _promise;
}

export function invalidateMonthlyPaymentStatus() {
  _cache = null;
  _promise = null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useMonthlyPaymentStatus() {
  // Initialise from cache so components that mount after the first fetch
  // render with data immediately (no extra network request).
  const [status, setStatus] = useState<MonthlyPaymentStatusData | null>(_cache);

  useEffect(() => {
    let cancelled = false;

    // Subscribe so other instances' refresh() calls update us too
    const sub = (data: MonthlyPaymentStatusData) => {
      if (!cancelled) setStatus(data);
    };
    _subscribers.add(sub);

    // Fetch (or reuse in-flight promise / cache)
    fetchOnce()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      _subscribers.delete(sub);
    };
  }, []);

  const refresh = useCallback(() => {
    invalidateMonthlyPaymentStatus();
    fetchOnce()
      .then((data) => setStatus(data))
      .catch(() => {});
  }, []);

  return { status, refresh };
}
