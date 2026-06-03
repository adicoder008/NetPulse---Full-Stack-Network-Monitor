-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('SERVICE_CREATED', 'SERVICE_CHECKED', 'SERVICE_FAILED', 'INCIDENT_OPENED', 'INCIDENT_RESOLVED');
CREATE TYPE "AlertChannelType" AS ENUM ('DISCORD', 'WEBHOOK');

-- AlterTable Service
ALTER TABLE "Service" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Service" ADD COLUMN "totalChecks" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN "successfulChecks" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "Service_tags_idx" ON "Service" USING GIN ("tags");

-- AlterTable Metric
ALTER TABLE "Metric" ADD COLUMN "region" TEXT NOT NULL DEFAULT 'default';
CREATE INDEX "Metric_serviceId_region_checkedAt_idx" ON "Metric"("serviceId", "region", "checkedAt" DESC);

-- CreateTable TimelineEvent
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT,
    "incidentId" TEXT,
    "eventType" "TimelineEventType" NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TimelineEvent_serviceId_createdAt_idx" ON "TimelineEvent"("serviceId", "createdAt" DESC);
CREATE INDEX "TimelineEvent_createdAt_idx" ON "TimelineEvent"("createdAt" DESC);
CREATE INDEX "TimelineEvent_eventType_createdAt_idx" ON "TimelineEvent"("eventType", "createdAt" DESC);
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable AlertChannel
CREATE TABLE "AlertChannel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AlertChannelType" NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AlertChannel_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AlertChannel_isEnabled_idx" ON "AlertChannel"("isEnabled");

-- CreateTable AlertDelivery
CREATE TABLE "AlertDelivery" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlertDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AlertDelivery_channelId_incidentId_alertType_key" ON "AlertDelivery"("channelId", "incidentId", "alertType");
CREATE INDEX "AlertDelivery_incidentId_idx" ON "AlertDelivery"("incidentId");
ALTER TABLE "AlertDelivery" ADD CONSTRAINT "AlertDelivery_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "AlertChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlertDelivery" ADD CONSTRAINT "AlertDelivery_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
