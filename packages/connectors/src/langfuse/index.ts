#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { LangfuseClient, MockLangfuseClient } from "./client.js";
import { toolDefinitions, createToolHandlers } from "./tools.js";

// Re-export types and client for library usage
export * from "./types.js";
export { LangfuseClient, MockLangfuseClient } from "./client.js";
export { toolDefinitions, createToolHandlers } from "./tools.js";

// Create and configure the MCP server
export function createLangfuseServer(options?: {
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;
  useMock?: boolean;
}) {
  const client =
    options?.useMock || !options?.publicKey || !options?.secretKey
      ? new MockLangfuseClient()
      : new LangfuseClient(options.publicKey, options.secretKey, options.baseUrl);

  const server = new McpServer({
    name: "langfuse",
    version: "0.1.0",
  });

  const handlers = createToolHandlers(client);

  // Register trace tools
  server.tool(
    "get_recent_traces",
    toolDefinitions.get_recent_traces.description,
    toolDefinitions.get_recent_traces.schema,
    handlers.get_recent_traces
  );

  server.tool(
    "get_trace_details",
    toolDefinitions.get_trace_details.description,
    toolDefinitions.get_trace_details.schema,
    handlers.get_trace_details
  );

  server.tool(
    "search_traces",
    toolDefinitions.search_traces.description,
    toolDefinitions.search_traces.schema,
    handlers.search_traces
  );

  server.tool(
    "get_traces_by_session",
    toolDefinitions.get_traces_by_session.description,
    toolDefinitions.get_traces_by_session.schema,
    handlers.get_traces_by_session
  );

  // Register observation tools
  server.tool(
    "get_observations",
    toolDefinitions.get_observations.description,
    toolDefinitions.get_observations.schema,
    handlers.get_observations
  );

  server.tool(
    "get_trace_observations",
    toolDefinitions.get_trace_observations.description,
    toolDefinitions.get_trace_observations.schema,
    handlers.get_trace_observations
  );

  server.tool(
    "get_observation_details",
    toolDefinitions.get_observation_details.description,
    toolDefinitions.get_observation_details.schema,
    handlers.get_observation_details
  );

  // Register score tools
  server.tool(
    "get_scores",
    toolDefinitions.get_scores.description,
    toolDefinitions.get_scores.schema,
    handlers.get_scores
  );

  server.tool(
    "get_trace_scores",
    toolDefinitions.get_trace_scores.description,
    toolDefinitions.get_trace_scores.schema,
    handlers.get_trace_scores
  );

  // Register session tools
  server.tool(
    "get_sessions",
    toolDefinitions.get_sessions.description,
    toolDefinitions.get_sessions.schema,
    handlers.get_sessions
  );

  server.tool(
    "get_session_details",
    toolDefinitions.get_session_details.description,
    toolDefinitions.get_session_details.schema,
    handlers.get_session_details
  );

  // Register prompt tools
  server.tool(
    "get_prompts",
    toolDefinitions.get_prompts.description,
    toolDefinitions.get_prompts.schema,
    handlers.get_prompts
  );

  server.tool(
    "get_prompt",
    toolDefinitions.get_prompt.description,
    toolDefinitions.get_prompt.schema,
    handlers.get_prompt
  );

  // Register analytics tools
  server.tool(
    "get_usage_summary",
    toolDefinitions.get_usage_summary.description,
    toolDefinitions.get_usage_summary.schema,
    handlers.get_usage_summary
  );

  server.tool(
    "get_model_usage",
    toolDefinitions.get_model_usage.description,
    toolDefinitions.get_model_usage.schema,
    handlers.get_model_usage
  );

  // Register user tools
  server.tool(
    "get_users",
    toolDefinitions.get_users.description,
    toolDefinitions.get_users.schema,
    handlers.get_users
  );

  server.tool(
    "get_user_traces",
    toolDefinitions.get_user_traces.description,
    toolDefinitions.get_user_traces.schema,
    handlers.get_user_traces
  );

  server.tool(
    "get_user_stats",
    toolDefinitions.get_user_stats.description,
    toolDefinitions.get_user_stats.schema,
    handlers.get_user_stats
  );

  return { server, client };
}

// CLI entry point - run when executed directly
async function main() {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const baseUrl = process.env.LANGFUSE_API_URL;

  if ((!publicKey || !secretKey) && process.env.VERBOSE) {
    console.error(
      "No LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY found, using mock data for development"
    );
  }

  const { server } = createLangfuseServer({
    publicKey,
    secretKey,
    baseUrl,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Only run main when this file is executed directly
const isMainModule =
  process.argv[1]?.endsWith("langfuse/index.js") ||
  process.argv[1]?.endsWith("langfuse/index.ts");
if (isMainModule) {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
