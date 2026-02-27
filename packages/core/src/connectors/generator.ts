/**
 * Connector YAML Generator
 * Creates connector definition files from discovered MCP servers
 */

import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { stringify } from "yaml";
import type { ConnectorDefinition, FetchDefinition, ParamDefinition } from "./types";
import type { DiscoveredTool } from "./discover";

/**
 * Sanitize connector ID to prevent path traversal attacks
 */
function sanitizeConnectorId(connectorId: string): string {
  return connectorId
    .replace(/[/\\]/g, "-")
    .replace(/\.\./g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .toLowerCase();
}

/**
 * Get the path to the local connectors directory
 */
export function getLocalConnectorsDir(): string {
  return join(homedir(), ".operator", "connectors");
}

/**
 * Ensure the local connectors directory exists
 */
export async function ensureLocalConnectorsDir(): Promise<void> {
  const dir = getLocalConnectorsDir();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

/**
 * Get the path for a connector YAML file
 */
export function getConnectorPath(connectorId: string): string {
  const safeId = sanitizeConnectorId(connectorId);
  return join(getLocalConnectorsDir(), `${safeId}.yaml`);
}

/**
 * Convert MCP tool input schema to fetch params
 */
function toolSchemaToParams(
  inputSchema?: DiscoveredTool["inputSchema"]
): Record<string, ParamDefinition> | undefined {
  if (!inputSchema?.properties) {
    return undefined;
  }

  const params: Record<string, ParamDefinition> = {};
  const required = inputSchema.required || [];
  const properties = inputSchema.properties as Record<string, { type?: string; description?: string }>;

  for (const [name, schema] of Object.entries(properties)) {
    params[name] = {
      type: (schema.type as ParamDefinition["type"]) || "string",
      required: required.includes(name),
      description: schema.description,
    };
  }

  return Object.keys(params).length > 0 ? params : undefined;
}

/**
 * Convert discovered tools to fetch definitions
 */
function toolsToFetches(tools: DiscoveredTool[]): Record<string, FetchDefinition> {
  const fetches: Record<string, FetchDefinition> = {};

  for (const tool of tools) {
    fetches[tool.name] = {
      tool: tool.name,
      description: tool.description,
      params: toolSchemaToParams(tool.inputSchema),
    };
  }

  return fetches;
}

/**
 * Generate a connector definition from discovered MCP server
 */
export function generateConnectorDefinition(
  connectorId: string,
  packageName: string,
  tools: DiscoveredTool[],
  envVars: string[]
): ConnectorDefinition {
  // Build env mapping for MCP config
  const envMapping: Record<string, string> = {};
  for (const envVar of envVars) {
    envMapping[envVar] = `{{credentials.${envVar}}}`;
  }

  // Build auth fields
  const authFields: Record<string, { label: string; type?: "text" | "password"; required?: boolean }> = {};
  for (const envVar of envVars) {
    authFields[envVar] = {
      label: envVar,
      type: "password",
      required: true,
    };
  }

  return {
    id: connectorId,
    name: connectorId.charAt(0).toUpperCase() + connectorId.slice(1),
    type: "mcp",
    description: `Connected via ${packageName}`,
    auth: envVars.length > 0
      ? {
          type: "token",
          fields: authFields,
        }
      : undefined,
    mcp: {
      package: packageName,
      env: Object.keys(envMapping).length > 0 ? envMapping : undefined,
    },
    fetches: toolsToFetches(tools),
  };
}

/**
 * Save a connector definition to the local connectors directory
 */
export async function saveConnectorDefinition(
  connector: ConnectorDefinition
): Promise<string> {
  await ensureLocalConnectorsDir();

  const filePath = getConnectorPath(connector.id);

  // Clean up undefined values for cleaner YAML
  const cleanConnector = JSON.parse(JSON.stringify(connector));

  const yamlContent = stringify(cleanConnector, {
    indent: 2,
    lineWidth: 0,
  });

  await writeFile(filePath, yamlContent, "utf-8");
  return filePath;
}
