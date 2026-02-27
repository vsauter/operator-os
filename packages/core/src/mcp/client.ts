import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import type { MCPConnection } from "../types";

/**
 * Find the monorepo root by looking for pnpm-workspace.yaml or package.json with workspaces
 */
function findMonorepoRoot(): string {
  let dir = process.cwd();

  // Walk up the directory tree
  while (true) {
    // Check for pnpm workspace marker
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }

    // Check for lerna marker
    if (existsSync(resolve(dir, "lerna.json"))) {
      return dir;
    }

    // Check for package.json with workspaces field
    const pkgPath = resolve(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const content = readFileSync(pkgPath, "utf-8");
        const pkg = JSON.parse(content);
        if (pkg.workspaces) {
          return dir;
        }
      } catch {
        // Ignore parsing errors
      }
    }

    // Move to parent directory
    const parent = dirname(dir);
    if (parent === dir) {
      // Reached filesystem root
      break;
    }
    dir = parent;
  }

  // Fallback to cwd
  return process.cwd();
}

export async function createClient(connection: MCPConnection): Promise<Client> {
  const cwd = findMonorepoRoot();
  const mergedEnv = { ...process.env, ...connection.env };
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(mergedEnv)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }

  const transport = new StdioClientTransport({
    command: connection.command,
    args: connection.args,
    env,
    cwd,
  });

  const client = new Client(
    { name: "operator-os", version: "0.1.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  return client;
}

export async function callTool(
  client: Client,
  tool: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const result = await client.callTool({ name: tool, arguments: args });
  return result.content;
}

export interface DiscoveredTool {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

export async function listTools(client: Client): Promise<DiscoveredTool[]> {
  const result = await client.listTools();
  return result.tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema as DiscoveredTool["inputSchema"],
  }));
}

export async function closeClient(client: Client): Promise<void> {
  await client.close();
}
