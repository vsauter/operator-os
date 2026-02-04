#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PostHogClient, MockPostHogClient } from "./client.js";
import { toolDefinitions, createToolHandlers } from "./tools.js";

// Re-export types and client for library usage
export * from "./types.js";
export { PostHogClient, MockPostHogClient } from "./client.js";
export { toolDefinitions, createToolHandlers } from "./tools.js";

// Create and configure the MCP server
export function createPostHogServer(options?: {
  apiKey?: string;
  projectId?: string;
  baseUrl?: string;
  useMock?: boolean;
}) {
  const client =
    options?.useMock || !options?.apiKey || !options?.projectId
      ? new MockPostHogClient()
      : new PostHogClient(options.apiKey, options.projectId, options.baseUrl);

  const server = new McpServer({
    name: "posthog",
    version: "0.1.0",
  });

  const handlers = createToolHandlers(client);

  // Register all tools
  server.tool(
    "get_recent_events",
    toolDefinitions.get_recent_events.description,
    toolDefinitions.get_recent_events.schema,
    handlers.get_recent_events
  );

  server.tool(
    "get_event_definitions",
    toolDefinitions.get_event_definitions.description,
    toolDefinitions.get_event_definitions.schema,
    handlers.get_event_definitions
  );

  server.tool(
    "get_persons",
    toolDefinitions.get_persons.description,
    toolDefinitions.get_persons.schema,
    handlers.get_persons
  );

  server.tool(
    "get_active_users",
    toolDefinitions.get_active_users.description,
    toolDefinitions.get_active_users.schema,
    handlers.get_active_users
  );

  server.tool(
    "get_user_activity",
    toolDefinitions.get_user_activity.description,
    toolDefinitions.get_user_activity.schema,
    handlers.get_user_activity
  );

  server.tool(
    "get_event_counts",
    toolDefinitions.get_event_counts.description,
    toolDefinitions.get_event_counts.schema,
    handlers.get_event_counts
  );

  server.tool(
    "run_hogql_query",
    toolDefinitions.run_hogql_query.description,
    toolDefinitions.run_hogql_query.schema,
    handlers.run_hogql_query
  );

  server.tool(
    "get_feature_flags",
    toolDefinitions.get_feature_flags.description,
    toolDefinitions.get_feature_flags.schema,
    handlers.get_feature_flags
  );

  server.tool(
    "get_cohorts",
    toolDefinitions.get_cohorts.description,
    toolDefinitions.get_cohorts.schema,
    handlers.get_cohorts
  );

  server.tool(
    "get_insights",
    toolDefinitions.get_insights.description,
    toolDefinitions.get_insights.schema,
    handlers.get_insights
  );

  return { server, client };
}

// CLI entry point - run when executed directly
async function main() {
  const apiKey = process.env.POSTHOG_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const baseUrl = process.env.POSTHOG_API_URL;

  if ((!apiKey || !projectId) && process.env.VERBOSE) {
    console.error(
      "No POSTHOG_API_KEY/POSTHOG_PROJECT_ID found, using mock data for development"
    );
  }

  const { server } = createPostHogServer({
    apiKey,
    projectId,
    baseUrl,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Only run main when this file is executed directly
const isMainModule =
  process.argv[1]?.endsWith("posthog/index.js") ||
  process.argv[1]?.endsWith("posthog/index.ts");
if (isMainModule) {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
