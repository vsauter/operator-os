/**
 * MCP Adapter
 * Executes fetch operations for MCP-based connectors
 */

import { createClient, callTool, closeClient } from "../mcp/client";
import { resolveTemplate } from "./resolver";
import type { ExecutionContext, AdapterResult } from "./types";

/**
 * Execute an MCP fetch operation
 */
export async function executeMcpFetch(
  context: ExecutionContext
): Promise<AdapterResult> {
  const { connector, fetch, credentials, params, sourceId, sourceName } =
    context;

  if (!connector.mcp) {
    throw new Error(`Connector ${connector.id} is not an MCP connector`);
  }

  if (!fetch.tool) {
    throw new Error(
      `Fetch operation ${context.fetchName} for connector ${connector.id} missing 'tool' field`
    );
  }

  // Resolve environment variables with credentials
  const resolvedEnv: Record<string, string> = {};
  if (process.env.VERBOSE) {
    resolvedEnv.VERBOSE = "1";
  }
  if (connector.mcp.env) {
    for (const [key, template] of Object.entries(connector.mcp.env)) {
      const resolved = resolveTemplate(template, credentials, params);
      // Only include non-empty values
      if (resolved && !resolved.includes("{{")) {
        resolvedEnv[key] = resolved;
      }
    }
  }

  // Build MCP connection - support both package and command/args formats
  let connection: { command: string; args: string[]; env: Record<string, string> };

  if (connector.mcp.command && connector.mcp.args) {
    // Custom command format: command + args
    connection = {
      command: connector.mcp.command,
      args: connector.mcp.args,
      env: resolvedEnv,
    };
  } else if (connector.mcp.package) {
    // Package format: npx -y <package>
    connection = {
      command: "npx",
      args: ["-y", connector.mcp.package],
      env: resolvedEnv,
    };
  } else {
    throw new Error(
      `Connector ${connector.id} MCP config must specify either 'package' or 'command'/'args'`
    );
  }

  // Execute the tool
  const client = await createClient(connection);
  try {
    const data = await callTool(client, fetch.tool, params);
    return {
      sourceId,
      sourceName,
      data,
    };
  } catch (error) {
    return {
      sourceId,
      sourceName,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await closeClient(client);
  }
}
