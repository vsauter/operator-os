"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import OperatorCard from "@/components/OperatorCard";
import SourceStatusList from "@/components/SourceStatusList";
import BriefingOutput from "@/components/BriefingOutput";
import { SourceStatusProps } from "@/components/SourceStatus";

interface Task {
  name: string;
  default?: boolean;
}

interface Operator {
  id: string;
  name: string;
  description?: string;
  connectors: string[];
  tasks: Record<string, Task>;
}

export default function Home() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sources, setSources] = useState<SourceStatusProps[]>([]);
  const [totalDurationMs, setTotalDurationMs] = useState<number | undefined>();
  const [briefing, setBriefing] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const fetchOperators = () => {
    fetch("/api/operators")
      .then((res) => res.json())
      .then((data) => setOperators(data.operators))
      .catch(() => setError("Failed to load operators"));
  };

  useEffect(() => {
    fetchOperators();
  }, []);

  async function runTask(operator: Operator, taskId: string) {
    setSelectedOperator(operator);
    setSelectedTaskId(taskId);
    setBriefing("");
    setError("");
    setLoading(true);
    setTotalDurationMs(undefined);

    // Initialize sources as loading (will be populated by API response)
    setSources(
      operator.connectors.map((connector) => ({
        id: connector.toLowerCase(),
        name: connector,
        status: "loading" as const,
      }))
    );

    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatorId: operator.id, taskId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to run task");
      }

      // Update sources with results from API
      if (data.sources) {
        setSources(data.sources);
      }
      setTotalDurationMs(data.totalDurationMs);

      // Handle LLM error separately from source errors
      if (data.error) {
        setError(data.error);
      }

      if (data.briefing) {
        setBriefing(data.briefing);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      // Mark all sources as error on catastrophic failure
      setSources((prev) =>
        prev.map((s) => ({
          ...s,
          status: "error" as const,
          error: "Request failed",
        }))
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Operators</h2>
          <Link
            href="/operators/new"
            className="bg-blue-600 text-white px-4 py-2 rounded font-medium text-sm hover:bg-blue-700"
          >
            New Operator
          </Link>
        </div>
        {operators.length === 0 ? (
          <p className="text-gray-500">Loading operators...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {operators.map((operator) => (
              <OperatorCard
                key={operator.id}
                operator={operator}
                selected={selectedOperator?.id === operator.id}
                loadingTaskId={loading && selectedOperator?.id === operator.id ? selectedTaskId : null}
                onRunTask={(taskId) => runTask(operator, taskId)}
                onDeleted={fetchOperators}
              />
            ))}
          </div>
        )}
      </section>

      {selectedOperator && sources.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Sources</h2>
          <SourceStatusList sources={sources} totalDurationMs={totalDurationMs} />
        </section>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {briefing && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Output</h2>
          <BriefingOutput content={briefing} />
        </section>
      )}
    </div>
  );
}
