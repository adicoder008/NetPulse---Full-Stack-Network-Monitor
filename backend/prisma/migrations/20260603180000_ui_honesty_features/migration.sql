-- Environment enum and service/incident fields for honest UI filters + alert ack

CREATE TYPE "Environment" AS ENUM ('PRODUCTION', 'STAGING', 'DEVELOPMENT');

ALTER TABLE "Service" ADD COLUMN "environment" "Environment" NOT NULL DEFAULT 'PRODUCTION';
CREATE INDEX "Service_environment_idx" ON "Service"("environment");

ALTER TABLE "Incident" ADD COLUMN "acknowledgedAt" TIMESTAMP(3);
ALTER TABLE "Incident" ADD COLUMN "acknowledgedBy" TEXT;
CREATE INDEX "Incident_acknowledgedAt_idx" ON "Incident"("acknowledgedAt");
