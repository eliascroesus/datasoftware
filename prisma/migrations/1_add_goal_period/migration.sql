-- Add goal period + below-goal colour to metric definitions
ALTER TABLE "MetricDefinition" ADD COLUMN "goalPeriod" TEXT;
ALTER TABLE "MetricDefinition" ADD COLUMN "belowColor" TEXT;
