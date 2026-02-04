#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { HubSpotClient, MockHubSpotClient } from "./client.js";
import { toolDefinitions, createToolHandlers } from "./tools.js";

// Re-export types and client for library usage
export * from "./types.js";
export { HubSpotClient, MockHubSpotClient } from "./client.js";
export { toolDefinitions, createToolHandlers } from "./tools.js";

// Create and configure the MCP server
export function createHubSpotServer(options?: {
  accessToken?: string;
  baseUrl?: string;
  useMock?: boolean;
}) {
  const client =
    options?.useMock || !options?.accessToken
      ? new MockHubSpotClient()
      : new HubSpotClient(options.accessToken, options.baseUrl);

  const server = new McpServer({
    name: "hubspot",
    version: "0.1.0",
  });

  const handlers = createToolHandlers(client);

  // Register all tools
  server.tool(
    "get_contacts",
    toolDefinitions.get_contacts.description,
    toolDefinitions.get_contacts.schema,
    handlers.get_contacts
  );

  server.tool(
    "get_contact",
    toolDefinitions.get_contact.description,
    toolDefinitions.get_contact.schema,
    handlers.get_contact
  );

  server.tool(
    "search_contacts",
    toolDefinitions.search_contacts.description,
    toolDefinitions.search_contacts.schema,
    handlers.search_contacts
  );

  server.tool(
    "get_recent_contacts",
    toolDefinitions.get_recent_contacts.description,
    toolDefinitions.get_recent_contacts.schema,
    handlers.get_recent_contacts
  );

  server.tool(
    "get_companies",
    toolDefinitions.get_companies.description,
    toolDefinitions.get_companies.schema,
    handlers.get_companies
  );

  server.tool(
    "get_company",
    toolDefinitions.get_company.description,
    toolDefinitions.get_company.schema,
    handlers.get_company
  );

  server.tool(
    "search_companies",
    toolDefinitions.search_companies.description,
    toolDefinitions.search_companies.schema,
    handlers.search_companies
  );

  server.tool(
    "get_deals",
    toolDefinitions.get_deals.description,
    toolDefinitions.get_deals.schema,
    handlers.get_deals
  );

  server.tool(
    "get_deal",
    toolDefinitions.get_deal.description,
    toolDefinitions.get_deal.schema,
    handlers.get_deal
  );

  server.tool(
    "get_open_deals",
    toolDefinitions.get_open_deals.description,
    toolDefinitions.get_open_deals.schema,
    handlers.get_open_deals
  );

  server.tool(
    "get_open_deals_with_owners",
    toolDefinitions.get_open_deals_with_owners.description,
    toolDefinitions.get_open_deals_with_owners.schema,
    handlers.get_open_deals_with_owners
  );

  server.tool(
    "get_deals_closing_soon",
    toolDefinitions.get_deals_closing_soon.description,
    toolDefinitions.get_deals_closing_soon.schema,
    handlers.get_deals_closing_soon
  );

  server.tool(
    "search_deals",
    toolDefinitions.search_deals.description,
    toolDefinitions.search_deals.schema,
    handlers.search_deals
  );

  server.tool(
    "search_deals_with_owners",
    toolDefinitions.search_deals_with_owners.description,
    toolDefinitions.search_deals_with_owners.schema,
    handlers.search_deals_with_owners
  );

  server.tool(
    "get_company_deals",
    toolDefinitions.get_company_deals.description,
    toolDefinitions.get_company_deals.schema,
    handlers.get_company_deals
  );

  server.tool(
    "get_owners",
    toolDefinitions.get_owners.description,
    toolDefinitions.get_owners.schema,
    handlers.get_owners
  );

  server.tool(
    "get_pipelines",
    toolDefinitions.get_pipelines.description,
    toolDefinitions.get_pipelines.schema,
    handlers.get_pipelines
  );

  server.tool(
    "get_pipeline_summary",
    toolDefinitions.get_pipeline_summary.description,
    toolDefinitions.get_pipeline_summary.schema,
    handlers.get_pipeline_summary
  );

  server.tool(
    "get_recent_engagements",
    toolDefinitions.get_recent_engagements.description,
    toolDefinitions.get_recent_engagements.schema,
    handlers.get_recent_engagements
  );

  server.tool(
    "get_crm_metrics",
    toolDefinitions.get_crm_metrics.description,
    toolDefinitions.get_crm_metrics.schema,
    handlers.get_crm_metrics
  );

  return { server, client };
}

// CLI entry point - run when executed directly
async function main() {
  const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
  const baseUrl = process.env.HUBSPOT_API_URL;

  if (!accessToken && process.env.VERBOSE) {
    console.error(
      "No HUBSPOT_ACCESS_TOKEN found, using mock data for development"
    );
  }

  const { server } = createHubSpotServer({
    accessToken,
    baseUrl,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Only run main when this file is executed directly
const isMainModule =
  process.argv[1]?.endsWith("hubspot/index.js") ||
  process.argv[1]?.endsWith("hubspot/index.ts");
if (isMainModule) {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
