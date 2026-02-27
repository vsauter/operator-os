"use client";

import { useState } from "react";

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

interface Source {
  id?: string;
  name?: string;
  connector?: string;
  fetch?: string;
  params?: Record<string, unknown>;
  connection?: {
    command: string;
    args: string[];
    env?: Record<string, string>;
  };
  tool?: string;
  args?: Record<string, unknown>;
}

interface ConnectionTestModalProps {
  open: boolean;
  onClose: () => void;
  sources: Source[];
}

interface SourceTestState {
  status: "idle" | "testing" | "success" | "error";
  result: TestResult | null;
}

export default function ConnectionTestModal({
  open,
  onClose,
  sources,
}: ConnectionTestModalProps) {
  const [testStates, setTestStates] = useState<Record<string, SourceTestState>>({});
  const [testingAll, setTestingAll] = useState(false);

  if (!open) return null;

  const testSource = async (source: Source) => {
    const sourceId = source.id ?? `${source.connector || "source"}-${source.fetch || "unknown"}`;

    // Legacy custom sources are not tested via browser endpoint anymore.
    if (!source.connector || !source.fetch) {
      setTestStates((prev) => ({
        ...prev,
        [sourceId]: {
          status: "error",
          result: {
            success: false,
            durationMs: 0,
            error: {
              code: "UNSUPPORTED_SOURCE",
              message: "Custom source testing is not supported in the browser",
              suggestion: "Use connector-based sources, or run custom-source tests from the CLI locally.",
            },
          },
        },
      }));
      return;
    }

    setTestStates((prev) => ({
      ...prev,
      [sourceId]: { status: "testing", result: null },
    }));

    try {
      const res = await fetch("/api/connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connector: source.connector,
          fetch: source.fetch,
          params: source.params,
        }),
      });

      const result: TestResult = await res.json();
      setTestStates((prev) => ({
        ...prev,
        [sourceId]: {
          status: result.success ? "success" : "error",
          result,
        },
      }));
    } catch {
      setTestStates((prev) => ({
        ...prev,
        [sourceId]: {
          status: "error",
          result: {
            success: false,
            durationMs: 0,
            error: {
              code: "NETWORK",
              message: "Network error",
              suggestion: "Check your connection.",
            },
          },
        },
      }));
    }
  };

  const testAllSources = async () => {
    setTestingAll(true);
    for (const source of sources) {
      await testSource(source);
    }
    setTestingAll(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "testing":
        return (
          <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      case "success":
        return <span className="text-green-600">✓</span>;
      case "error":
        return <span className="text-red-600">✕</span>;
      default:
        return <span className="text-gray-400">○</span>;
    }
  };

  const successCount = Object.values(testStates).filter((s) => s.status === "success").length;
  const errorCount = Object.values(testStates).filter((s) => s.status === "error").length;
  const testedCount = successCount + errorCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Test Connections</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="mb-4">
          <button
            onClick={testAllSources}
            disabled={testingAll}
            className={`px-4 py-2 rounded font-medium text-sm ${
              testingAll
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {testingAll ? "Testing..." : "Test All Connections"}
          </button>
          {testedCount > 0 && (
            <span className="ml-3 text-sm text-gray-600">
              {successCount}/{sources.length} passed
              {errorCount > 0 && <span className="text-red-600 ml-1">({errorCount} failed)</span>}
            </span>
          )}
        </div>

        <div className="space-y-3">
          {sources.map((source) => {
            const sourceId = source.id ?? `${source.connector || "source"}-${source.fetch || "unknown"}`;
            const state = testStates[sourceId] || { status: "idle", result: null };
            return (
              <div
                key={sourceId}
                className={`border rounded-lg p-4 ${
                  state.status === "success"
                    ? "border-green-200 bg-green-50"
                    : state.status === "error"
                    ? "border-red-200 bg-red-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(state.status)}
                    <div>
                      <p className="font-medium">{source.name || sourceId}</p>
                      {source.connector && source.fetch ? (
                        <p className="text-xs text-gray-500">
                          {source.connector}.{source.fetch}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600">
                          Legacy custom source (not testable in browser)
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {state.result?.durationMs && (
                      <span className="text-xs text-gray-400">{state.result.durationMs}ms</span>
                    )}
                    <button
                      onClick={() => testSource(source)}
                      disabled={state.status === "testing"}
                      className={`text-xs px-3 py-1 rounded ${
                        state.status === "testing"
                          ? "bg-gray-100 text-gray-400"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      {state.status === "testing" ? "..." : "Test"}
                    </button>
                  </div>
                </div>

                {state.status === "success" && state.result?.data && (
                  <div className="mt-2 text-sm text-green-700">
                    Loaded {state.result.data.itemCount} items
                    {state.result.data.sample !== undefined && (
                      <details className="mt-1">
                        <summary className="text-xs text-gray-500 cursor-pointer">
                          Show sample
                        </summary>
                        <pre className="mt-1 bg-white p-2 rounded text-xs overflow-auto max-h-32">
                          {JSON.stringify(state.result.data.sample, null, 2) as string}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                {state.status === "error" && state.result?.error && (
                  <div className="mt-2 text-sm">
                    <p className="text-red-700">{state.result.error.message}</p>
                    <p className="text-red-600 text-xs mt-1">{state.result.error.suggestion}</p>
                    {state.result.availableTools && state.result.availableTools.length > 0 && (
                      <p className="text-gray-600 text-xs mt-1">
                        Available tools: {state.result.availableTools.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
