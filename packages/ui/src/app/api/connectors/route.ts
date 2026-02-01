import { NextResponse } from "next/server";
import { readFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { parse } from "yaml";

interface FetchDefinition {
  tool?: string;
  endpoint?: string;
  description?: string;
  params?: Record<string, unknown>;
}

interface ConnectorDefinition {
  id: string;
  name: string;
  type: "mcp" | "api";
  description?: string;
  mcp?: {
    command?: string;
    args?: string[];
    package?: string;
    env?: Record<string, string>;
  };
  api?: {
    baseUrl?: string;
    auth?: unknown;
  };
  fetches: Record<string, FetchDefinition>;
  auth?: {
    type: string;
    fields?: Record<string, { label?: string; type?: string; default?: string }>;
  };
}

interface ConnectorInfo {
  id: string;
  name: string;
  type: "mcp" | "api";
  description?: string;
  fetches: {
    id: string;
    tool?: string;
    endpoint?: string;
    description?: string;
    params?: Record<string, unknown>;
  }[];
  auth?: {
    type: string;
    fields: { name: string; label: string; type: string; envVar: string }[];
  };
}

function findProjectRoot(): string {
  let dir = process.cwd();

  // Walk up looking for pnpm-workspace.yaml (monorepo root indicator)
  while (true) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    // Also check for root-level config directory as backup indicator
    if (existsSync(resolve(dir, "config")) && existsSync(resolve(dir, "connectors"))) {
      return dir;
    }

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return process.cwd();
}

async function loadConnectors(): Promise<ConnectorInfo[]> {
  const projectRoot = findProjectRoot();
  const connectorsDir = join(projectRoot, "connectors");

  if (!existsSync(connectorsDir)) {
    return [];
  }

  const files = await readdir(connectorsDir);
  const yamlFiles = files.filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

  const connectors: ConnectorInfo[] = [];

  for (const file of yamlFiles) {
    try {
      const content = await readFile(join(connectorsDir, file), "utf-8");
      const def = parse(content) as ConnectorDefinition;

      if (!def.id) continue;

      const fetches = Object.entries(def.fetches || {}).map(([id, fetch]) => ({
        id,
        tool: fetch.tool,
        endpoint: fetch.endpoint,
        description: fetch.description,
        params: fetch.params,
      }));

      const authFields = def.auth?.fields
        ? Object.entries(def.auth.fields).map(([name, field]) => {
            const envSuffix = name
              .replace(/([A-Z])/g, "_$1")
              .toUpperCase()
              .replace(/^_/, "");
            const envVar = `${def.id.toUpperCase().replace(/-/g, "_")}_${envSuffix}`;

            return {
              name,
              label: field.label || name,
              type: field.type || "text",
              envVar,
            };
          })
        : [];

      connectors.push({
        id: def.id,
        name: def.name,
        type: def.type,
        description: def.description,
        fetches,
        auth: def.auth
          ? {
              type: def.auth.type,
              fields: authFields,
            }
          : undefined,
      });
    } catch (error) {
      console.warn(`Failed to load connector from ${file}:`, error);
    }
  }

  return connectors.sort((a, b) => a.name.localeCompare(b.name));
}

export async function GET() {
  try {
    const connectors = await loadConnectors();
    return NextResponse.json({ connectors });
  } catch (error) {
    console.error("Failed to load connectors:", error);
    return NextResponse.json(
      { error: "Failed to load connectors" },
      { status: 500 }
    );
  }
}
