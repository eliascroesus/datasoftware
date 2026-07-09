import { prisma } from "@/lib/db";
import { listIntegrations, publicIntegration } from "@/lib/integrations";
import { MetricsClient } from "./MetricsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function MetricsPage({
  searchParams,
}: {
  searchParams: { integrationId?: string };
}) {
  const [defs, integrations] = await Promise.all([
    prisma.metricDefinition.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    listIntegrations(),
  ]);

  return (
    <MetricsClient
      initialMetrics={defs as any}
      integrations={integrations.map(publicIntegration)}
      defaultIntegrationId={searchParams.integrationId ?? ""}
    />
  );
}
