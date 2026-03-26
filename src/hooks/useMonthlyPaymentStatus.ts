"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

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
  exempt?: boolean;
  exemptReason?: string | null;
  today: { month: number; year: number; day: number };
  isDonationMonth: boolean;
  currentMonthSummary: MonthSummary | null;
  unpaidMonths: MonthSummary[];
  unpaidCount: number;
  monthSummaries: MonthSummary[];
}

// ── Module-level dedup cache ──────────────────────────────────────────────────
const _cache = new Map<string, MonthlyPaymentStatusData>();
const _promise = new Map<string, Promise<MonthlyPaymentStatusData>>();
const _subscribers = new Map<string, Set<(data: MonthlyPaymentStatusData) => void>>();

function getSubscribers(cacheKey: string) {
  let set = _subscribers.get(cacheKey);
  if (!set) {
    set = new Set<(data: MonthlyPaymentStatusData) => void>();
    _subscribers.set(cacheKey, set);
  }
  return set;
}

function fetchOnce(cacheKey: string): Promise<MonthlyPaymentStatusData> {
  const cached = _cache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const pending = _promise.get(cacheKey);
  if (pending) return pending;

  const request = fetch("/api/monthly-payments/status", { cache: "no-store" })
    .then((r) => r.json())
    .then((data: MonthlyPaymentStatusData) => {
      _cache.set(cacheKey, data);
      _promise.delete(cacheKey);
      // Notify all other mounted instances
      getSubscribers(cacheKey).forEach((cb) => cb(data));
      return data;
    })
    .catch((err) => {
      _promise.delete(cacheKey);
      throw err;
    });

  _promise.set(cacheKey, request);
  return request;
}

export function invalidateMonthlyPaymentStatus(cacheKey?: string) {
  if (cacheKey) {
    _cache.delete(cacheKey);
    _promise.delete(cacheKey);
    return;
  }
  _cache.clear();
  _promise.clear();
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useMonthlyPaymentStatus() {
  const { data: session } = useSession();
  const cacheKey = session?.user?.email || "__no-session__";

  // Initialise from cache so components that mount after the first fetch
  // render with data immediately (no extra network request).
  const [status, setStatus] = useState<MonthlyPaymentStatusData | null>(
    () => _cache.get(cacheKey) ?? null
  );

  useEffect(() => {
    setStatus(_cache.get(cacheKey) ?? null);
  }, [cacheKey]);

  useEffect(() => {
    let cancelled = false;

    if (!session?.user?.email) {
      setStatus(null);
      return () => {
        cancelled = true;
      };
    }

    // Subscribe so other instances' refresh() calls update us too
    const sub = (data: MonthlyPaymentStatusData) => {
      if (!cancelled) setStatus(data);
    };
    const subscribers = getSubscribers(cacheKey);
    subscribers.add(sub);

    // Fetch (or reuse in-flight promise / cache)
    fetchOnce(cacheKey)
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      subscribers.delete(sub);
    };
  }, [cacheKey, session?.user?.email]);

  const refresh = useCallback(() => {
    invalidateMonthlyPaymentStatus(cacheKey);
    fetchOnce(cacheKey)
      .then((data) => setStatus(data))
      .catch(() => {});
  }, [cacheKey]);

  return { status, refresh };
}
