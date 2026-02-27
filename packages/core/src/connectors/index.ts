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
} from "./types";

export { isConnectorSource, isLegacySource } from "./types";

// Registry
export {
  ConnectorRegistry,
  getRegistry,
  initRegistry,
  resetRegistry,
} from "./registry";

// Resolver
export {
  resolveSource,
  resolveCredentials,
  resolveTemplate,
  resolveTemplates,
  mergeParams,
  validateParams,
} from "./resolver";

// Adapters
export { executeMcpFetch } from "./mcp-adapter";
export { executeApiFetch } from "./api-adapter";

// Credentials
export {
  getCredentialsDir,
  getCredentialsPath,
  ensureCredentialsDir,
  saveCredentials,
  loadCredentials,
  getCredential,
  deleteCredentials,
} from "./credentials";

// Discovery
export {
  discoverMcpServer,
  checkPackageExists,
  type DiscoveryResult,
  type DiscoveredTool,
} from "./discover";

// Generator
export {
  getLocalConnectorsDir,
  ensureLocalConnectorsDir,
  getConnectorPath,
  generateConnectorDefinition,
  saveConnectorDefinition,
} from "./generator";
