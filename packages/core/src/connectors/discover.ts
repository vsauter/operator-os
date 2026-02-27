/**
 * MCP Server Discovery
 * Connects to MCP servers and discovers available tools
 */

import { createClient, listTools, closeClient, type DiscoveredTool } from "../mcp/client";

export interface DiscoveryResult {
  success: boolean;
  tools: DiscoveredTool[];
  error?: string;
  requiredEnvVars?: string[];
}

/**
 * Parse error message to extract required environment variables
 */
function parseRequiredEnvVars(errorMessage: string): string[] {
  const envVars: string[] = [];

  // Common patterns for missing env var errors
  const patterns = [
    /(\w+)\s+environment variable\s+(?:is\s+)?required/gi,
    /missing\s+(?:required\s+)?(?:environment\s+)?(?:variable\s+)?[`"']?(\w+)[`"']?/gi,
    /(?:env|environment)\s+(?:var|variable)\s+[`"']?(\w+)[`"']?\s+(?:is\s+)?(?:not\s+set|missing|required)/gi,
    /[`"']?(\w+)[`"']?\s+(?:is\s+)?not\s+(?:set|defined)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(errorMessage)) !== null) {
      const varName = match[1];
      // Filter out common false positives
      if (varName && varName === varName.toUpperCase() && varName.length > 2) {
        if (!envVars.includes(varName)) {
          envVars.push(varName);
        }
      }
    }
  }

  return envVars;
}

/**
 * Attempt to discover tools from an MCP server
 */
export async function discoverMcpServer(
  packageName: string,
  env: Record<string, string> = {}
): Promise<DiscoveryResult> {
  const connection = {
    command: "npx",
    args: ["-y", packageName],
    env,
  };

  try {
    const client = await createClient(connection);
    const tools = await listTools(client);
    await closeClient(client);

    return {
      success: true,
      tools,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const requiredEnvVars = parseRequiredEnvVars(errorMessage);

    return {
      success: false,
      tools: [],
      error: errorMessage,
      requiredEnvVars: requiredEnvVars.length > 0 ? requiredEnvVars : undefined,
    };
  }
}

/**
 * Check if an npm package exists (basic check via npx --help)
 * This is a lightweight check that doesn't fully download the package
 */
export async function checkPackageExists(packageName: string): Promise<boolean> {
  const { spawn } = await import("child_process");

  return new Promise((resolve) => {
    // Use npm view to check if package exists
    const proc = spawn("npm", ["view", packageName, "name"], {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 10000,
    });

    let resolved = false;

    proc.on("close", (code) => {
      if (!resolved) {
        resolved = true;
        resolve(code === 0);
      }
    });

    proc.on("error", () => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    });

    // Timeout fallback
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        proc.kill();
        resolve(false);
      }
    }, 10000);
  });
}

export type { DiscoveredTool };
