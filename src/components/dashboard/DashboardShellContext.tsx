"use client";

import { createContext, useContext } from "react";

/**
 * Signals to child DashboardLayout components that the persistent
 * DashboardShell (topbar + sidebar) has already been rendered via
 * the dashboard route layout.tsx, so they should skip re-rendering it.
 */
interface DashboardShellContextValue {
  /** True when DashboardShell is mounted as a persistent layout ancestor. */
  isMounted: boolean;
}

export const DashboardShellContext = createContext<DashboardShellContextValue>({
  isMounted: false,
});

export function useDashboardShell() {
  return useContext(DashboardShellContext);
}
