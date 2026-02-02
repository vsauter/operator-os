/**
 * API Adapter
 * Executes fetch operations for API-based connectors
 */

import { resolveTemplate, resolveTemplates } from "./resolver";
import type { ExecutionContext, AdapterResult } from "./types";

/**
 * Parse endpoint string into method and path
 * e.g., "POST /calls" -> { method: "POST", path: "/calls" }
 */
function parseEndpoint(endpoint: string): { method: string; path: string } {
  const parts = endpoint.trim().split(/\s+/);
  if (parts.length === 2) {
    return { method: parts[0].toUpperCase(), path: parts[1] };
  }
  // Default to GET if no method specified
  return { method: "GET", path: parts[0] };
}

/**
 * Build authentication headers
 */
function buildAuthHeaders(
  auth: NonNullable<NonNullable<ExecutionContext["connector"]["api"]>["auth"]>,
  credentials: ExecutionContext["credentials"],
  params: ExecutionContext["params"]
): Record<string, string> {
  const headers: Record<string, string> = {};
  const headerName = auth.header ?? "Authorization";

  switch (auth.type) {
    case "basic": {
      const username = auth.username
        ? resolveTemplate(auth.username, credentials, params)
        : "";
      const password = auth.password
        ? resolveTemplate(auth.password, credentials, params)
        : "";
      const encoded = Buffer.from(`${username}:${password}`).toString("base64");
      headers[headerName] = `Basic ${encoded}`;
      break;
    }
    case "token": {
      const token = auth.token
        ? resolveTemplate(auth.token, credentials, params)
        : "";
      headers[headerName] = `Bearer ${token}`;
      break;
    }
    case "none":
    default:
      // No auth headers
      break;
  }

  return headers;
}

/**
 * Build query string from params for GET requests
 */
function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

/**
 * Execute an API fetch operation
 */
export async function executeApiFetch(
  context: ExecutionContext
): Promise<AdapterResult> {
  const { connector, fetch, credentials, params, sourceId, sourceName } =
    context;

  if (!connector.api) {
    throw new Error(`Connector ${connector.id} is not an API connector`);
  }

  if (!fetch.endpoint) {
    throw new Error(
      `Fetch operation ${context.fetchName} for connector ${connector.id} missing 'endpoint' field`
    );
  }

  try {
    // Parse the endpoint
    const { method, path } = parseEndpoint(fetch.endpoint);

    // Build URL
    let url = `${connector.api.baseUrl}${path}`;

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add auth headers
    if (connector.api.auth) {
      Object.assign(
        headers,
        buildAuthHeaders(connector.api.auth, credentials, params)
      );
    }

    // Add custom headers
    if (connector.api.headers) {
      for (const [key, value] of Object.entries(connector.api.headers)) {
        headers[key] = resolveTemplate(value, credentials, params);
      }
    }

    // Build request options
    const options: RequestInit = {
      method,
      headers,
    };

    // Handle body for POST/PUT/PATCH
    if (["POST", "PUT", "PATCH"].includes(method) && fetch.body) {
      const resolvedBody = resolveTemplates(fetch.body, credentials, params);
      options.body = JSON.stringify(resolvedBody);
    } else if (method === "GET" && Object.keys(params).length > 0) {
      // Add query params for GET requests
      url += buildQueryString(params);
    }

    // Make the request
    const response = await globalThis.fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      return {
        sourceId,
        sourceName,
        data: null,
        error: `API request failed: ${response.status} ${response.statusText} - ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      sourceId,
      sourceName,
      data,
    };
  } catch (error) {
    return {
      sourceId,
      sourceName,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
