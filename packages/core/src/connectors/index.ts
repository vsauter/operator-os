/**
 * Connector Registry System
 * Public exports for the connector module
 */

// Types
export type {
  ConnectorDefinition,
  ConnectorSource,
  LegacySource,
  OperatorSource,
  FetchDefinition,
  ExecutionContext,
  AdapterResult,
  AuthField,
  AuthConfig,
  MCPConfig,
  APIConfig,
  ParamDefinition,
  ResolvedCredentials,
} from "./types.js";

export { isConnectorSource, isLegacySource } from "./types.js";

// Registry
export {
  ConnectorRegistry,
  getRegistry,
  initRegistry,
  resetRegistry,
} from "./registry.js";

// Resolver
export {
  resolveSource,
  resolveCredentials,
  resolveTemplate,
  resolveTemplates,
  mergeParams,
  validateParams,
} from "./resolver.js";

// Adapters
export { executeMcpFetch } from "./mcp-adapter.js";
export { executeApiFetch } from "./api-adapter.js";

// Credentials
export {
  getCredentialsDir,
  getCredentialsPath,
  ensureCredentialsDir,
  saveCredentials,
  loadCredentials,
  getCredential,
  deleteCredentials,
} from "./credentials.js";

// Discovery
export {
  discoverMcpServer,
  checkPackageExists,
  type DiscoveryResult,
  type DiscoveredTool,
} from "./discover.js";

// Generator
export {
  getLocalConnectorsDir,
  ensureLocalConnectorsDir,
  getConnectorPath,
  generateConnectorDefinition,
  saveConnectorDefinition,
} from "./generator.js";
