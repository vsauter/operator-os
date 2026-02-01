"use client";

import { useState } from "react";

interface ConnectionConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface TestResult {
  success: boolean;
  durationMs: number;
  error?: {
    code: string;
    message: string;
    suggestion: string;
  };
  data?: {
    itemCount: number;
    sample: unknown;
  };
  availableTools?: string[];
}

interface TestConnectionButtonProps {
  connection: ConnectionConfig;
  tool: string;
  args?: Record<string, unknown>;
  onResult?: (result: TestResult) => void;
  compact?: boolean;
}

export default function TestConnectionButton({
  connection,
  tool,
  args,
  onResult,
  compact = false,
}: TestConnectionButtonProps) {
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [result, setResult] = useState<TestResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const runTest = async () => {
    setStatus("testing");
    setResult(null);
    setShowDetails(false);

    try {
      const res = await fetch("/api/connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection, tool, args }),
      });

      const data: TestResult = await res.json();
      setResult(data);
      setStatus(data.success ? "success" : "error");
      onResult?.(data);
    } catch {
      const errorResult: TestResult = {
        success: false,
        durationMs: 0,
        error: {
          code: "NETWORK",
          message: "Network error",
          suggestion: "Check your internet connection and try again.",
        },
      };
      setResult(errorResult);
      setStatus("error");
      onResult?.(errorResult);
    }
  };

  const getStatusDisplay = () => {
    switch (status) {
      case "idle":
        return null;
      case "testing":
        return (
          <span className="text-blue-600 text-xs flex items-center gap-1">
            <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Testing...
          </span>
        );
      case "success":
        return (
          <span className="text-green-600 text-xs flex items-center gap-1">
            <span>✓</span>
            {result?.data ? `${result.data.itemCount} items` : "Connected"}
            <span className="text-gray-400">({result?.durationMs}ms)</span>
          </span>
        );
      case "error":
        return (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-red-600 text-xs flex items-center gap-1 hover:underline"
          >
            <span>✕</span>
            {result?.error?.message || "Failed"}
            <span className="text-gray-400">{showDetails ? "▲" : "▼"}</span>
          </button>
        );
    }
  };

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2">
        <button
          onClick={runTest}
          disabled={status === "testing"}
          className={`text-xs px-2 py-1 rounded ${
            status === "testing"
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
        >
          {status === "testing" ? "..." : "Test"}
        </button>
        {getStatusDisplay()}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <button
          onClick={runTest}
          disabled={status === "testing"}
          className={`text-sm px-3 py-1.5 rounded font-medium ${
            status === "testing"
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
        >
          {status === "testing" ? "Testing..." : "Test Connection"}
        </button>
        {getStatusDisplay()}
      </div>

      {showDetails && result?.error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm space-y-2">
          <div>
            <span className="font-medium text-red-800">Error: </span>
            <span className="text-red-700">{result.error.message}</span>
            <span className="text-red-400 text-xs ml-2">({result.error.code})</span>
          </div>
          <div className="text-red-600 text-xs">
            <span className="font-medium">Suggestion: </span>
            {result.error.suggestion}
          </div>
          {result.availableTools && result.availableTools.length > 0 && (
            <div className="text-gray-600 text-xs">
              <span className="font-medium">Available tools: </span>
              {result.availableTools.join(", ")}
            </div>
          )}
        </div>
      )}

      {status === "success" && result?.data?.sample !== undefined && (
        <details className="text-xs">
          <summary className="text-gray-500 cursor-pointer hover:text-gray-700">
            Show sample data
          </summary>
          <pre className="mt-2 bg-gray-50 p-2 rounded overflow-auto max-h-40 text-xs">
            {JSON.stringify(result.data.sample, null, 2) as string}
          </pre>
        </details>
      )}
    </div>
  );
}
