import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { wsUrl } from "@/lib/api";
import type { WsConnectionStatus } from "@/lib/filters";
import type { WsEvent } from "@/types";

export function useWebSocket(onStatusChange?: (status: WsConnectionStatus) => void) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<WsConnectionStatus>("connecting");
  const invalidateTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let unmounted = false;

    function set(s: WsConnectionStatus) {
      if (!unmounted) {
        setStatus(s);
        onStatusChange?.(s);
      }
    }

    function scheduleInvalidate(keys: string[]) {
      clearTimeout(invalidateTimer.current);
      invalidateTimer.current = setTimeout(() => {
        for (const key of keys) {
          void qc.invalidateQueries({ queryKey: [key] });
        }
      }, 500);
    }

    function connect() {
      set("connecting");
      ws = new WebSocket(wsUrl);

      ws.onopen = () => set("connected");

      ws.onmessage = (msg) => {
        const event = JSON.parse(msg.data) as WsEvent;

        if (event.type === "service.status.updated") {
          scheduleInvalidate(["summary", "dashboard-metrics", "history", "probes", "raw-metrics"]);
        }

        if (event.type === "incident.opened" || event.type === "incident.resolved") {
          scheduleInvalidate(["incidents", "dashboard-metrics", "timeline", "alerts-feed"]);
        }
      };

      ws.onerror = () => set("disconnected");

      ws.onclose = () => {
        set("disconnected");
        reconnectTimer = setTimeout(connect, 3000);
      };
    }

    connect();
    return () => {
      unmounted = true;
      clearTimeout(reconnectTimer);
      clearTimeout(invalidateTimer.current);
      ws?.close();
    };
  }, [qc, onStatusChange]);

  return status;
}
