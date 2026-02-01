import { createClient, callTool, closeClient } from "../mcp/client";
import type { ContextSource, ContextResult } from "../types";

export async function gatherContext(
  sources: ContextSource[]
): Promise<ContextResult[]> {
  const results = await Promise.allSettled(
    sources.map(async (source) => {
      const client = await createClient(source.connection);
      try {
        const data = await callTool(client, source.tool, source.args);
        return {
          sourceId: source.id,
          sourceName: source.name,
          data,
        };
      } finally {
        await closeClient(client);
      }
    })
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      sourceId: sources[i].id,
      sourceName: sources[i].name,
      data: null,
      error: result.reason?.message || "Unknown error",
    };
  });
}
