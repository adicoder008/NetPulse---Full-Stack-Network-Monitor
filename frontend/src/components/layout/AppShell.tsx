import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useWebSocket } from "@/hooks/useWebSocket";
import { AppContext } from "@/context/AppContext";
import { queryClient } from "@/lib/query-client";
import type { AppFilters, WsConnectionStatus } from "@/lib/filters";

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [environment, setEnvironment] = useState<AppFilters["environment"]>("production");
  const [search, setSearch] = useState("");
  const [wsStatus, setWsStatus] = useState<WsConnectionStatus>("connecting");

  useWebSocket(setWsStatus);

  // Gentle fallback refresh every 30s (WebSocket handles real-time)
  useEffect(() => {
    const id = setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: ["summary"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const filters: AppFilters = { environment, search };

  return (
    <AppContext.Provider value={{ filters, setEnvironment, setSearch, wsStatus }}>
      <div className="flex h-screen overflow-hidden bg-surface">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-5">
            <Outlet />
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
}
