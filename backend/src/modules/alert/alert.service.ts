import { AlertChannelType, Incident, IncidentStatus } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma.client.js";
import { logger } from "../../config/logger.js";
import { alertHandlers } from "./alert.channels.js";
import { AlertPayload, AlertType } from "./alert.types.js";

export class AlertService {
  async dispatchForIncident(incident: Incident, alertType: AlertType) {
    const service = await prisma.service.findUnique({
      where: { id: incident.serviceId },
      select: { id: true, name: true, url: true }
    });
    if (!service) return;

    const channels = await prisma.alertChannel.findMany({ where: { isEnabled: true } });
    const payload: AlertPayload = { alertType, incident, service };

    for (const channel of channels) {
      const existing = await prisma.alertDelivery.findUnique({
        where: {
          channelId_incidentId_alertType: {
            channelId: channel.id,
            incidentId: incident.id,
            alertType
          }
        }
      });
      if (existing) continue;

      const handler = alertHandlers[channel.type];
      if (!handler) continue;

      try {
        await handler.send(channel.webhookUrl, payload);
        await prisma.alertDelivery.create({
          data: { channelId: channel.id, incidentId: incident.id, alertType }
        });
      } catch (error) {
        logger.error({ error, channelId: channel.id, alertType }, "alert delivery failed");
      }
    }
  }

  async onIncidentChange(incident: Incident) {
    if (incident.status === IncidentStatus.OPEN) {
      await this.dispatchForIncident(incident, "INCIDENT_OPENED");
    } else {
      await this.dispatchForIncident(incident, "INCIDENT_RESOLVED");
    }
  }

  listChannels() {
    return prisma.alertChannel.findMany({ orderBy: { createdAt: "desc" } });
  }

  createChannel(data: { name: string; type: AlertChannelType; webhookUrl: string }) {
    return prisma.alertChannel.create({ data });
  }

  deleteChannel(id: string) {
    return prisma.alertChannel.delete({ where: { id } });
  }

  toggleChannel(id: string, isEnabled: boolean) {
    return prisma.alertChannel.update({ where: { id }, data: { isEnabled } });
  }
}
