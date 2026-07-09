import type { Connector } from "./types";
import { closeConnector } from "./close";
import { calendlyConnector } from "./calendly";
import { sendblueConnector } from "./sendblue";
import { instantlyConnector } from "./instantly";
import { googleSheetsConnector } from "./googleSheets";
import { webhookConnector } from "./webhook";

export const connectors: Connector[] = [
  closeConnector,
  calendlyConnector,
  sendblueConnector,
  instantlyConnector,
  googleSheetsConnector,
  webhookConnector,
];

const byProvider = new Map(connectors.map((c) => [c.provider, c]));

export function getConnector(provider: string): Connector | undefined {
  return byProvider.get(provider);
}

// Public-safe descriptor for a connector (no functions), for client components.
export interface ConnectorMeta {
  provider: string;
  name: string;
  description: string;
  category: string;
  color: string;
  docsUrl?: string;
  supportsWebhook: boolean;
  supportsSync: boolean;
  credentialFields: Connector["credentialFields"];
  configFields: Connector["configFields"];
}

export function connectorMeta(c: Connector): ConnectorMeta {
  return {
    provider: c.provider,
    name: c.name,
    description: c.description,
    category: c.category,
    color: c.color,
    docsUrl: c.docsUrl,
    supportsWebhook: c.supportsWebhook,
    supportsSync: c.supportsSync,
    credentialFields: c.credentialFields,
    configFields: c.configFields,
  };
}

export function allConnectorMeta(): ConnectorMeta[] {
  return connectors.map(connectorMeta);
}

export type { Connector };
export * from "./types";
