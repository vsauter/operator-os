/**
 * Connector type definitions
 */

// Auth field definition for connector configuration
export interface AuthField {
  label: string;
  type?: "text" | "password";
  required?: boolean;
}

// Re-export AuthField as a type for iteration
export type AuthFieldMap = Record<string, AuthField>;

// Parameter definition for fetch operations
export interface ParamDefinition {
  type: "string" | "number" | "boolean" | "object" | "array";
  default?: unknown;
  required?: boolean;
  description?: string;
}

// Fetch operation definition
export interface FetchDefinition {
  tool?: string; // For MCP connectors
  endpoint?: string; // For API connectors (e.g., "GET /calls", "POST /deals")
  description?: string;
  params?: Record<string, ParamDefinition>;
  body?: Record<string, unknown>; // For API connectors with request body
}

// MCP-specific configuration
export interface MCPConfig {
  package?: string; // NPM package to run via npx
  command?: string; // Custom command (alternative to package)
  args?: string[]; // Custom args (used with command)
  env?: Record<string, string>; // e.g., { HUBSPOT_ACCESS_TOKEN: "{{credentials.accessToken}}" }
}

// API-specific configuration
export interface APIConfig {
  baseUrl: string;
  auth: {
    type: "basic" | "token" | "none";
    username?: string; // Template: "{{credentials.accessKey}}"
    password?: string; // Template: "{{credentials.accessSecret}}"
    token?: string; // Template: "{{credentials.token}}"
    header?: string; // Custom header name, defaults to "Authorization"
  };
  headers?: Record<string, string>; // Additional headers
}

// Auth configuration for a connector
export interface AuthConfig {
  type: "token" | "basic" | "api-key" | "none";
  fields: Record<string, AuthField>;
}

// Complete connector definition (loaded from YAML)
export interface ConnectorDefinition {
  id: string;
  name: string;
  type: "mcp" | "api";
  icon?: string;
  description?: string;
  mcp?: MCPConfig;
  api?: APIConfig;
  fetches: Record<string, FetchDefinition>;
  auth?: AuthConfig;
}

// New operator source format using connectors
export interface ConnectorSource {
  connector: string; // Connector ID
  fetch: string; // Fetch operation name
  params?: Record<string, unknown>;
  id?: string; // Optional override for source ID
  name?: string; // Optional override for source name
}

// Legacy source format (for backward compatibility)
export interface LegacySource {
  id: string;
  name: string;
  connection: {
    command: string;
    args: string[];
    env?: Record<string, string>;
  };
  tool: string;
  args: Record<string, unknown>;
}

// Union type for all source formats
export type OperatorSource = ConnectorSource | LegacySource;

// Resolved credentials for a connector
export interface ResolvedCredentials {
  [key: string]: string;
}

// Execution context for adapters
export interface ExecutionContext {
  connector: ConnectorDefinition;
  fetch: FetchDefinition;
  fetchName: string;
  credentials: ResolvedCredentials;
  params: Record<string, unknown>;
  sourceId: string;
  sourceName: string;
}

// Adapter result
export interface AdapterResult {
  sourceId: string;
  sourceName: string;
  data: unknown;
  error?: string;
}

// Type guards
export function isConnectorSource(source: OperatorSource): source is ConnectorSource {
  return "connector" in source && "fetch" in source;
}

export function isLegacySource(source: OperatorSource): source is LegacySource {
  return "connection" in source && "tool" in source;
}
