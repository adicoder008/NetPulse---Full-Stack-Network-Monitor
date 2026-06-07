-- Store HTTP response code on each health-check metric
ALTER TABLE "Metric" ADD COLUMN IF NOT EXISTS "statusCode" INTEGER;
