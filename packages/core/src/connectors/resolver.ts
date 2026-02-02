/**
 * Credential Resolver
 * Resolves {{credentials.field}} templates and merges params
 */

import { getRegistry } from "./registry";
import type {
  ConnectorSource,
  ConnectorDefinition,
  FetchDefinition,
  ExecutionContext,
  ResolvedCredentials,
  ParamDefinition,
  AuthField,
} from "./types";

/**
 * Resolve credentials from environment variables
 * Maps connector auth fields to env vars (e.g., accessToken -> HUBSPOT_ACCESS_TOKEN)
 */
export function resolveCredentials(
  connector: ConnectorDefinition
): ResolvedCredentials {
  const credentials: ResolvedCredentials = {};

  if (!connector.auth?.fields) {
    return credentials;
  }

  const connectorPrefix = connector.id.toUpperCase().replace(/-/g, "_");

  for (const [fieldName, field] of Object.entries(connector.auth.fields)) {
    // Convert camelCase to SCREAMING_SNAKE_CASE
    const envSuffix = fieldName
      .replace(/([A-Z])/g, "_$1")
      .toUpperCase()
      .replace(/^_/, "");

    const envVar = `${connectorPrefix}_${envSuffix}`;
    const value = process.env[envVar];

    if (value) {
      credentials[fieldName] = value;
    } else if (field.required !== false) {
      // Only warn for required fields (default is required)
      console.warn(
        `Missing environment variable ${envVar} for connector ${connector.id}`
      );
    }
  }

  return credentials;
}

/**
 * Resolve a template string with credentials and params
 * Supports: {{credentials.field}}, {{params.field}}
 */
export function resolveTemplate(
  template: string,
  credentials: ResolvedCredentials,
  params: Record<string, unknown>
): string {
  return template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, scope, field) => {
    if (scope === "credentials") {
      return credentials[field] ?? match;
    }
    if (scope === "params") {
      const value = params[field];
      return value !== undefined ? String(value) : match;
    }
    return match;
  });
}

/**
 * Resolve all templates in an object recursively
 */
export function resolveTemplates<T>(
  obj: T,
  credentials: ResolvedCredentials,
  params: Record<string, unknown>
): T {
  if (typeof obj === "string") {
    return resolveTemplate(obj, credentials, params) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      resolveTemplates(item, credentials, params)
    ) as T;
  }

  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveTemplates(value, credentials, params);
    }
    return result as T;
  }

  return obj;
}

/**
 * Merge user params with fetch defaults
 */
export function mergeParams(
  fetchDef: FetchDefinition,
  userParams?: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};

  // Apply defaults from fetch definition
  if (fetchDef.params) {
    for (const [key, def] of Object.entries(fetchDef.params)) {
      if (def.default !== undefined) {
        merged[key] = def.default;
      }
    }
  }

  // Override with user params
  if (userParams) {
    Object.assign(merged, userParams);
  }

  return merged;
}

/**
 * Validate required parameters
 */
export function validateParams(
  fetchDef: FetchDefinition,
  params: Record<string, unknown>
): string[] {
  const errors: string[] = [];

  if (fetchDef.params) {
    for (const [key, def] of Object.entries(fetchDef.params)) {
      if (def.required && params[key] === undefined) {
        errors.push(`Missing required parameter: ${key}`);
      }
    }
  }

  return errors;
}

/**
 * Resolve a connector source into an execution context
 */
export async function resolveSource(
  source: ConnectorSource
): Promise<ExecutionContext> {
  const registry = getRegistry();

  // Get connector definition
  const connector = registry.get(source.connector);
  if (!connector) {
    throw new Error(
      `Unknown connector: ${source.connector}. ` +
        `Available connectors: ${registry.listIds().join(", ") || "none"}`
    );
  }

  // Get fetch definition
  const fetch = connector.fetches[source.fetch];
  if (!fetch) {
    throw new Error(
      `Unknown fetch operation: ${source.fetch} for connector ${source.connector}. ` +
        `Available fetches: ${Object.keys(connector.fetches).join(", ")}`
    );
  }

  // Resolve credentials
  const credentials = resolveCredentials(connector);

  // Merge params with defaults
  const params = mergeParams(fetch, source.params);

  // Validate params
  const errors = validateParams(fetch, params);
  if (errors.length > 0) {
    throw new Error(
      `Invalid params for ${source.connector}.${source.fetch}: ${errors.join(", ")}`
    );
  }

  // Generate source ID and name
  const sourceId = source.id ?? `${source.connector}-${source.fetch}`;
  const sourceName =
    source.name ?? `${connector.name} ${fetch.description ?? source.fetch}`;

  return {
    connector,
    fetch,
    fetchName: source.fetch,
    credentials,
    params,
    sourceId,
    sourceName,
  };
}
