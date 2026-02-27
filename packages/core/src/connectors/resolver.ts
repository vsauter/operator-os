/**
 * Credential Resolver
 * Resolves {{credentials.field}} templates and merges params
 */

import { getRegistry } from "./registry";
import { loadCredentials } from "./credentials";
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
 * Resolve credentials from local files and environment variables
 * Checks: 1) Local credential files (~/.operator/credentials/)
 *         2) Environment variables (CONNECTOR_FIELD_NAME)
 */
export async function resolveCredentials(
  connector: ConnectorDefinition
): Promise<ResolvedCredentials> {
  const credentials: ResolvedCredentials = {};

  if (!connector.auth?.fields) {
    return credentials;
  }

  // Load local credentials file if it exists
  const localCredentials = await loadCredentials(connector.id);

  const connectorPrefix = connector.id.toUpperCase().replace(/-/g, "_");

  const fields = connector.auth.fields as Record<string, AuthField>;
  for (const [fieldName, field] of Object.entries(fields)) {
    // Convert camelCase to SCREAMING_SNAKE_CASE
    const envSuffix = fieldName
      .replace(/([A-Z])/g, "_$1")
      .toUpperCase()
      .replace(/^_/, "");

    const envVar = `${connectorPrefix}_${envSuffix}`;

    // Priority: 1) Environment variable, 2) Local credential file (by env var name), 3) Local credential file (by field name)
    const value = process.env[envVar]
      ?? localCredentials?.[envVar]
      ?? localCredentials?.[fieldName];

    if (value) {
      credentials[fieldName] = value;
    } else if (field.required !== false && process.env.VERBOSE) {
      console.warn(
        `Missing credential ${fieldName} (${envVar}) for connector ${connector.id}`
      );
    }
  }

  return credentials;
}

/**
 * Resolve a template string with credentials, params, and dynamic values
 * Supports: {{credentials.field}}, {{params.field}}, {{date.today}}, {{date.daysAgo.N}}
 */
export function resolveTemplate(
  template: string,
  credentials: ResolvedCredentials,
  params: Record<string, unknown>
): string {
  // First handle date templates: {{date.today}}, {{date.daysAgo.30}}
  let result = template.replace(/\{\{date\.(\w+)(?:\.(\d+))?\}\}/g, (match, type, days) => {
    const now = new Date();
    if (type === "today") {
      return now.toISOString();
    }
    if (type === "daysAgo" && days) {
      const pastDate = new Date(now.getTime() - parseInt(days) * 24 * 60 * 60 * 1000);
      return pastDate.toISOString();
    }
    if (type === "startOfDay") {
      now.setHours(0, 0, 0, 0);
      return now.toISOString();
    }
    return match;
  });

  // Then handle credentials and params
  result = result.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, scope, field) => {
    if (scope === "credentials") {
      return credentials[field] ?? match;
    }
    if (scope === "params") {
      const value = params[field];
      return value !== undefined ? String(value) : match;
    }
    return match;
  });

  return result;
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
 * @param source - The connector source configuration
 * @param runtimeParams - Optional runtime parameters that override source params
 */
export async function resolveSource(
  source: ConnectorSource,
  runtimeParams?: Record<string, unknown>
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
  const credentials = await resolveCredentials(connector);

  // Merge params: defaults -> source params -> runtime params
  let params = mergeParams(fetch, source.params);
  if (runtimeParams) {
    params = { ...params, ...runtimeParams };
  }

  // Resolve {{params.x}} templates in merged params using runtime params
  if (runtimeParams) {
    params = resolveTemplates(params, {}, runtimeParams);
  }

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
