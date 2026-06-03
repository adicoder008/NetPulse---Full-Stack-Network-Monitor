import { AlertChannelHandler, AlertPayload } from "./alert.types.js";

function buildEmbed(payload: AlertPayload) {
  const isOpen = payload.alertType === "INCIDENT_OPENED";
  const color = isOpen ? 0xe11d48 : 0x10b981;
  const title = isOpen ? "Incident Opened" : "Incident Resolved";
  return {
    embeds: [
      {
        title: `[NetPulse] ${title}`,
        color,
        fields: [
          { name: "Service", value: payload.service.name, inline: true },
          { name: "URL", value: payload.service.url, inline: false },
          { name: "Summary", value: payload.incident.summary, inline: false },
          {
            name: "Incident ID",
            value: payload.incident.id,
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  };
}

export class DiscordWebhookHandler implements AlertChannelHandler {
  readonly type = "DISCORD";

  async send(webhookUrl: string, payload: AlertPayload): Promise<void> {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildEmbed(payload))
    });
    if (!res.ok) {
      throw new Error(`Discord webhook failed: ${res.status}`);
    }
  }
}

export class GenericWebhookHandler implements AlertChannelHandler {
  readonly type = "WEBHOOK";

  async send(webhookUrl: string, payload: AlertPayload): Promise<void> {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "netpulse",
        alertType: payload.alertType,
        incident: payload.incident,
        service: payload.service,
        sentAt: new Date().toISOString()
      })
    });
    if (!res.ok) {
      throw new Error(`Webhook failed: ${res.status}`);
    }
  }
}

export const alertHandlers: Record<string, AlertChannelHandler> = {
  DISCORD: new DiscordWebhookHandler(),
  WEBHOOK: new GenericWebhookHandler()
};
