import { createContext, useContext } from "react";
import type { AppFilters, WsConnectionStatus } from "@/lib/filters";

type AppContextValue = {
  filters: AppFilters;
  setEnvironment: (env: AppFilters["environment"]) => void;
  setSearch: (search: string) => void;
  wsStatus: WsConnectionStatus;
};

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppShell");
  return ctx;
}

export function useAppFilters() {
  return useAppContext().filters;
}

export function useWsStatus() {
  return useAppContext().wsStatus;
}
