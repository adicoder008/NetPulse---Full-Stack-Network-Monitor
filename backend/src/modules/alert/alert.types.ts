import { Incident, Service } from "@prisma/client";

export type AlertType = "INCIDENT_OPENED" | "INCIDENT_RESOLVED";

export type AlertPayload = {
  alertType: AlertType;
  incident: Incident;
  service: Pick<Service, "id" | "name" | "url">;
};

export interface AlertChannelHandler {
  readonly type: string;
  send(webhookUrl: string, payload: AlertPayload): Promise<void>;
}
