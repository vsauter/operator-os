import { NextRequest, NextResponse } from "next/server";
import { resolveSource, executeMcpFetch, executeApiFetch, getRegistry } from "@operator/core";
import { checkRateLimit, getClientId, RATE_LIMITS } from "@/lib/rate-limit";
import { connectionTestSchema, validateRequest } from "@/lib/validation";

interface TestRequest {
  connector: string;
  fetch: string;
  params?: Record<string, unknown>;
}

interface ErrorInfo {
  code: string;
  message: string;
  suggestion: string;
}

interface TestResponse {
  success: boolean;
  durationMs: number;
  error?: ErrorInfo;
  data?: {
    itemCount: number;
    sample: unknown;
  };
  availableTools?: string[];
}

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isLoopbackIp(ip: string): boolean {
  const normalized = ip.trim().toLowerCase();
  return (
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "::ffff:127.0.0.1"
  );
}

function isLocalRequest(request: NextRequest): boolean {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return isLoopbackIp(firstIp);
    }
  }

  const hostHeader = request.headers.get("host");
  if (hostHeader) {
    const host = hostHeader.split(":")[0].toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") {
      return true;
    }
  }

  const urlHost = request.nextUrl.hostname?.toLowerCase();
  if (urlHost === "localhost" || urlHost === "127.0.0.1" || urlHost === "::1") {
    return true;
  }

  return false;
}

function mapError(error: unknown): ErrorInfo {
  const message = error instanceof Error ? error.message : String(error);
  const errorStr = message.toLowerCase();

  if (errorStr.includes("enoent") || errorStr.includes("command not found")) {
    return {
      code: "ENOENT",
      message: "Command not found",
      suggestion: "Make sure npx or node is in your PATH. Try running the command manually in terminal.",
    };
  }

  if (errorStr.includes("404") || (errorStr.includes("not found") && errorStr.includes("package"))) {
    return {
      code: "E404",
      message: "Package not found",
      suggestion: "Check the package name. Run: npx [package-name] to see if it exists.",
    };
  }

  if (errorStr.includes("timeout") || errorStr.includes("timed out")) {
    return {
      code: "TIMEOUT",
      message: "Connection timeout",
      suggestion: "MCP server took too long to start. Check if it requires authentication or has startup issues.",
    };
  }

  if (errorStr.includes("auth") || errorStr.includes("api key") || errorStr.includes("apikey") ||
      errorStr.includes("unauthorized") || errorStr.includes("401")) {
    return {
      code: "AUTH",
      message: "Authentication failed",
      suggestion: "Check your API key or credentials. Make sure the required environment variable is set.",
    };
  }

  if (errorStr.includes("tool") && (errorStr.includes("not found") || errorStr.includes("unknown"))) {
    return {
      code: "TOOL_NOT_FOUND",
      message: "Tool not found",
      suggestion: "This MCP server does not have this tool. Check the tool name.",
    };
  }

  if (errorStr.includes("closed") || errorStr.includes("exited") || errorStr.includes("crashed")) {
    return {
      code: "CONNECTION_CLOSED",
      message: "Server crashed",
      suggestion: "MCP server exited unexpectedly. Check if all required dependencies are installed.",
    };
  }

  if (errorStr.includes("econnrefused") || errorStr.includes("connection refused")) {
    return {
      code: "CONNECTION_REFUSED",
      message: "Connection refused",
      suggestion: "The server refused the connection. Make sure it's running and accessible.",
    };
  }

  return {
    code: "UNKNOWN",
    message: message.slice(0, 200),
    suggestion: "Check the server logs for more details. Try running the command manually.",
  };
}

function countItems(data: unknown): number {
  if (Array.isArray(data)) {
    return data.length;
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["items", "results", "data", "records", "entries", "content"]) {
      if (Array.isArray(obj[key])) {
        return (obj[key] as unknown[]).length;
      }
    }
    return Object.keys(obj).length;
  }
  return 1;
}

function getSample(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data[0];
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["items", "results", "data", "records", "entries", "content"]) {
      if (Array.isArray(obj[key]) && (obj[key] as unknown[]).length > 0) {
        return (obj[key] as unknown[])[0];
      }
    }
  }
  return data;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const allowRemoteConnectionTest = isTruthy(process.env.OPERATOR_ALLOW_REMOTE_CONNECTION_TEST);

  if (!allowRemoteConnectionTest && !isLocalRequest(request)) {
    return NextResponse.json(
      {
        success: false,
        durationMs: Date.now() - startTime,
        error: {
          code: "REMOTE_DISABLED",
          message: "Connection testing is restricted to localhost by default",
          suggestion: "Set OPERATOR_ALLOW_REMOTE_CONNECTION_TEST=true to explicitly allow remote requests.",
        },
      } as TestResponse,
      { status: 403 }
    );
  }

  const clientId = getClientId(request);
  const rateLimit = checkRateLimit(`connection-test:${clientId}`, RATE_LIMITS.connectionTest);
  if (!rateLimit.success) {
    return NextResponse.json(
      {
        success: false,
        durationMs: Date.now() - startTime,
        error: {
          code: "RATE_LIMIT",
          message: "Rate limit exceeded",
          suggestion: "Please wait before testing more connections.",
        },
      } as TestResponse,
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const validation = validateRequest(connectionTestSchema, body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        durationMs: Date.now() - startTime,
        error: {
          code: "INVALID_REQUEST",
          message: validation.error,
          suggestion: "Select a valid connector and fetch operation.",
        },
      } as TestResponse, { status: 400 });
    }

    const { connector, fetch, params = {} } = validation.data as TestRequest;
    await getRegistry().load();

    const context = await resolveSource({
      connector,
      fetch,
      params,
    });

    const result = context.connector.type === "mcp"
      ? await executeMcpFetch(context)
      : await executeApiFetch(context);

    if (result.error) {
      return NextResponse.json({
        success: false,
        durationMs: Date.now() - startTime,
        error: mapError(result.error),
      } as TestResponse);
    }

    const itemCount = countItems(result.data);
    const sample = getSample(result.data);

    return NextResponse.json({
      success: true,
      durationMs: Date.now() - startTime,
      data: {
        itemCount,
        sample,
      },
    } as TestResponse);
  } catch (error) {
    console.error("Connection test failed:", error);
    return NextResponse.json({
      success: false,
      durationMs: Date.now() - startTime,
      error: mapError(error),
    } as TestResponse);
  }
}
