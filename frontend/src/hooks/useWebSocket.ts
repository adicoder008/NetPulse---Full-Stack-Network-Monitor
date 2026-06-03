import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { wsUrl } from "@/lib/api";
import type { WsConnectionStatus } from "@/lib/filters";
import type { WsEvent } from "@/types";

export function useWebSocket(onStatusChange?: (status: WsConnectionStatus) => void) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<WsConnectionStatus>("connecting");

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

    function connect() {
      set("connecting");
      ws = new WebSocket(wsUrl);

      ws.onopen = () => set("connected");

      ws.onmessage = (msg) => {
        const event = JSON.parse(msg.data) as WsEvent;

        if (event.type === "service.status.updated") {
          void qc.invalidateQueries({ queryKey: ["summary"] });
          void qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
          void qc.invalidateQueries({ queryKey: ["service", event.payload.serviceId] });
          void qc.invalidateQueries({ queryKey: ["health", event.payload.serviceId] });
          void qc.invalidateQueries({ queryKey: ["history", event.payload.serviceId] });
          void qc.invalidateQueries({ queryKey: ["probes", event.payload.serviceId] });
        }

        if (event.type === "incident.opened" || event.type === "incident.resolved") {
          void qc.invalidateQueries({ queryKey: ["incidents"] });
          void qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
          void qc.invalidateQueries({ queryKey: ["timeline"] });
          void qc.invalidateQueries({ queryKey: ["alerts-feed"] });
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
      ws?.close();
    };
  }, [qc, onStatusChange]);

  return status;
}
