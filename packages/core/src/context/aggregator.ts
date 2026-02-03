import { createClient, callTool, closeClient } from "../mcp/client";
import type { ContextSource, ContextResult } from "../types";
import type { OperatorSource, LegacySource } from "../connectors/types";
import {
  isConnectorSource,
  isLegacySource,
  getRegistry,
  resolveSource,
  executeMcpFetch,
  executeApiFetch,
} from "../connectors/index";

/**
 * Execute a legacy source (backward compatibility)
 */
async function executeLegacySource(source: LegacySource): Promise<ContextResult> {
  const client = await createClient(source.connection);
  try {
    const data = await callTool(client, source.tool, source.args);
    return {
      sourceId: source.id,
      sourceName: source.name,
      data,
    };
  } catch (error) {
    return {
      sourceId: source.id,
      sourceName: source.name,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await closeClient(client);
  }
}

/**
 * Gather context from all sources (supports both new connector and legacy formats)
 * @param sources - Array of operator sources to fetch
 * @param runtimeParams - Optional runtime parameters that override/merge with source params
 */
export async function gatherContext(
  sources: OperatorSource[],
  runtimeParams?: Record<string, unknown>
): Promise<ContextResult[]> {
  // Initialize the connector registry
  await getRegistry().load();

  const results = await Promise.allSettled(
    sources.map(async (source) => {
      if (isConnectorSource(source)) {
        // New connector format - pass runtime params
        const context = await resolveSource(source, runtimeParams);

        if (context.connector.type === "mcp") {
          return executeMcpFetch(context);
        } else {
          return executeApiFetch(context);
        }
      } else if (isLegacySource(source)) {
        // Legacy format
        return executeLegacySource(source);
      } else {
        throw new Error("Unknown source format");
      }
    })
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    // Extract source ID for error reporting
    const source = sources[i];
    const sourceId = isConnectorSource(source)
      ? source.id ?? `${source.connector}-${source.fetch}`
      : (source as LegacySource).id;
    const sourceName = isConnectorSource(source)
      ? source.name ?? source.connector
      : (source as LegacySource).name;

    return {
      sourceId,
      sourceName,
      data: null,
      error: result.reason?.message || "Unknown error",
    };
  });
}

/**
 * Legacy function signature for backward compatibility
 * @deprecated Use gatherContext with OperatorSource[] instead
 */
export async function gatherContextLegacy(
  sources: ContextSource[]
): Promise<ContextResult[]> {
  return gatherContext(sources as OperatorSource[]);
}
