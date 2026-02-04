#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PylonClient, MockPylonClient } from "./client.js";
import { toolDefinitions, createToolHandlers } from "./tools.js";

// Re-export types and client for library usage
export * from "./types.js";
export { PylonClient, MockPylonClient } from "./client.js";
export { toolDefinitions, createToolHandlers } from "./tools.js";

// Create and configure the MCP server
export function createPylonServer(options?: {
  apiKey?: string;
  baseUrl?: string;
  useMock?: boolean;
}) {
  const client =
    options?.useMock || !options?.apiKey
      ? new MockPylonClient()
      : new PylonClient(options.apiKey, options.baseUrl);

  const server = new McpServer({
    name: "pylon",
    version: "0.1.0",
  });

  const handlers = createToolHandlers(client);

  // Register all tools
  server.tool(
    "get_open_issues",
    toolDefinitions.get_open_issues.description,
    toolDefinitions.get_open_issues.schema,
    handlers.get_open_issues
  );

  server.tool(
    "get_issues_waiting_on_team",
    toolDefinitions.get_issues_waiting_on_team.description,
    toolDefinitions.get_issues_waiting_on_team.schema,
    handlers.get_issues_waiting_on_team
  );

  server.tool(
    "get_urgent_issues",
    toolDefinitions.get_urgent_issues.description,
    toolDefinitions.get_urgent_issues.schema,
    handlers.get_urgent_issues
  );

  server.tool(
    "search_issues",
    toolDefinitions.search_issues.description,
    toolDefinitions.search_issues.schema,
    handlers.search_issues
  );

  server.tool(
    "get_issue_details",
    toolDefinitions.get_issue_details.description,
    toolDefinitions.get_issue_details.schema,
    handlers.get_issue_details
  );

  server.tool(
    "get_account_issues",
    toolDefinitions.get_account_issues.description,
    toolDefinitions.get_account_issues.schema,
    handlers.get_account_issues
  );

  server.tool(
    "get_accounts",
    toolDefinitions.get_accounts.description,
    toolDefinitions.get_accounts.schema,
    handlers.get_accounts
  );

  server.tool(
    "search_account_issues",
    toolDefinitions.search_account_issues.description,
    toolDefinitions.search_account_issues.schema,
    handlers.search_account_issues
  );

  server.tool(
    "get_support_metrics",
    toolDefinitions.get_support_metrics.description,
    toolDefinitions.get_support_metrics.schema,
    handlers.get_support_metrics
  );

  return { server, client };
}

// CLI entry point - run when executed directly
async function main() {
  const apiKey = process.env.PYLON_API_KEY;
  const apiUrl = process.env.PYLON_API_URL;

  if (!apiKey && process.env.VERBOSE) {
    console.error("No PYLON_API_KEY found, using mock data for development");
  }

  const { server } = createPylonServer({
    apiKey,
    baseUrl: apiUrl,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Only run main when this file is executed directly
const isMainModule = process.argv[1]?.endsWith("pylon/index.js") ||
                     process.argv[1]?.endsWith("pylon/index.ts");
if (isMainModule) {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
