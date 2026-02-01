import { NextRequest, NextResponse } from "next/server";
import { createClient, callTool, closeClient } from "@operator/core";

interface TestRequest {
  connection: {
    command: string;
    args: string[];
    env?: Record<string, string>;
  };
  tool: string;
  args?: Record<string, unknown>;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let client: any = null;

  try {
    const body: TestRequest = await request.json();
    const { connection, tool, args = {} } = body;

    if (!connection || !connection.command) {
      return NextResponse.json({
        success: false,
        durationMs: Date.now() - startTime,
        error: {
          code: "INVALID_REQUEST",
          message: "Missing connection configuration",
          suggestion: "Provide a connection with command and args.",
        },
      } as TestResponse);
    }

    // Substitute environment variables
    const processedEnv: Record<string, string> = {};
    if (connection.env) {
      for (const [key, value] of Object.entries(connection.env)) {
        if (typeof value === "string" && value.startsWith("$")) {
          const envVar = value.slice(1);
          processedEnv[key] = process.env[envVar] || "";
        } else {
          processedEnv[key] = value;
        }
      }
    }

    const processedConnection = {
      ...connection,
      env: processedEnv,
    };

    // Connect with timeout
    const connectPromise = createClient(processedConnection);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Connection timeout after 10s")), 10000);
    });

    client = await Promise.race([connectPromise, timeoutPromise]);

    // Call the tool
    if (tool) {
      const data = await callTool(client, tool, args);
      const itemCount = countItems(data);
      const sample = getSample(data);

      return NextResponse.json({
        success: true,
        durationMs: Date.now() - startTime,
        data: {
          itemCount,
          sample,
        },
      } as TestResponse);
    }

    // Just connection test without tool call
    return NextResponse.json({
      success: true,
      durationMs: Date.now() - startTime,
    } as TestResponse);

  } catch (error) {
    console.error("Connection test failed:", error);
    return NextResponse.json({
      success: false,
      durationMs: Date.now() - startTime,
      error: mapError(error),
    } as TestResponse);
  } finally {
    if (client) {
      try {
        await closeClient(client);
      } catch {
        // Ignore close errors
      }
    }
  }
}
