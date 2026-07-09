import { listIntegrations, publicIntegration } from "@/lib/integrations";
import { allConnectorMeta } from "@/lib/connectors";
import { getAppUrl } from "@/lib/config";
import { IntegrationsClient } from "./IntegrationsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const [integrations, connectors] = await Promise.all([
    listIntegrations(),
    Promise.resolve(allConnectorMeta()),
  ]);

  return (
    <IntegrationsClient
      connectors={connectors}
      initialIntegrations={integrations.map(publicIntegration)}
      appUrl={getAppUrl()}
    />
  );
}
