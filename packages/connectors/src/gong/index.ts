#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GongClient, MockGongClient } from "./client.js";
import { toolDefinitions, createToolHandlers } from "./tools.js";

// Re-export types and client for library usage
export * from "./types.js";
export { GongClient, MockGongClient } from "./client.js";
export { toolDefinitions, createToolHandlers } from "./tools.js";

// Create and configure the MCP server
export function createGongServer(options?: {
  accessKey?: string;
  accessKeySecret?: string;
  baseUrl?: string;
  useMock?: boolean;
}) {
  const client =
    options?.useMock || (!options?.accessKey || !options?.accessKeySecret)
      ? new MockGongClient()
      : new GongClient(options.accessKey, options.accessKeySecret, options.baseUrl);

  const server = new McpServer({
    name: "gong",
    version: "0.1.0",
  });

  const handlers = createToolHandlers(client);

  // Register all tools
  server.tool(
    "get_recent_calls",
    toolDefinitions.get_recent_calls.description,
    toolDefinitions.get_recent_calls.schema,
    handlers.get_recent_calls
  );

  server.tool(
    "get_call_details",
    toolDefinitions.get_call_details.description,
    toolDefinitions.get_call_details.schema,
    handlers.get_call_details
  );

  server.tool(
    "get_open_deals",
    toolDefinitions.get_open_deals.description,
    toolDefinitions.get_open_deals.schema,
    handlers.get_open_deals
  );

  server.tool(
    "get_important_deals",
    toolDefinitions.get_important_deals.description,
    toolDefinitions.get_important_deals.schema,
    handlers.get_important_deals
  );

  server.tool(
    "get_at_risk_deals",
    toolDefinitions.get_at_risk_deals.description,
    toolDefinitions.get_at_risk_deals.schema,
    handlers.get_at_risk_deals
  );

  server.tool(
    "get_deal_activity",
    toolDefinitions.get_deal_activity.description,
    toolDefinitions.get_deal_activity.schema,
    handlers.get_deal_activity
  );

  server.tool(
    "search_calls",
    toolDefinitions.search_calls.description,
    toolDefinitions.search_calls.schema,
    handlers.search_calls
  );

  server.tool(
    "get_team_activity",
    toolDefinitions.get_team_activity.description,
    toolDefinitions.get_team_activity.schema,
    handlers.get_team_activity
  );

  return { server, client };
}

// CLI entry point - run when executed directly
async function main() {
  const accessKey = process.env.GONG_ACCESS_KEY;
  const accessKeySecret = process.env.GONG_ACCESS_KEY_SECRET;
  const baseUrl = process.env.GONG_API_URL;

  if (!accessKey || !accessKeySecret) {
    console.error(
      "No GONG_ACCESS_KEY/GONG_ACCESS_KEY_SECRET found, using mock data for development"
    );
  }

  const { server } = createGongServer({
    accessKey,
    accessKeySecret,
    baseUrl,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Only run main when this file is executed directly
const isMainModule = process.argv[1]?.endsWith("gong/index.js") ||
                     process.argv[1]?.endsWith("gong/index.ts");
if (isMainModule) {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
