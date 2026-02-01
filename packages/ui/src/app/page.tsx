"use client";

import { useState, useEffect } from "react";
import OperatorCard from "@/components/OperatorCard";
import SourceStatus from "@/components/SourceStatus";
import BriefingOutput from "@/components/BriefingOutput";

interface Operator {
  id: string;
  name: string;
  description?: string;
  sources: { id: string; name: string }[];
}

interface SourceResult {
  sourceId: string;
  sourceName: string;
  status: "pending" | "loading" | "success" | "error";
  error?: string;
}

export default function Home() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [sources, setSources] = useState<SourceResult[]>([]);
  const [briefing, setBriefing] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetch("/api/operators")
      .then((res) => res.json())
      .then((data) => setOperators(data.operators))
      .catch(() => setError("Failed to load operators"));
  }, []);

  async function generateBriefing(operator: Operator) {
    setSelectedOperator(operator);
    setBriefing("");
    setError("");
    setLoading(true);

    setSources(
      operator.sources.map((s) => ({
        sourceId: s.id,
        sourceName: s.name,
        status: "loading",
      }))
    );

    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatorId: operator.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate briefing");
      }

      setSources(
        data.sourceResults.map((s: { sourceId: string; sourceName: string; error?: string }) => ({
          sourceId: s.sourceId,
          sourceName: s.sourceName,
          status: s.error ? "error" : "success",
          error: s.error,
        }))
      );

      setBriefing(data.briefing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-4">Operators</h2>
        {operators.length === 0 ? (
          <p className="text-gray-500">Loading operators...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {operators.map((operator) => (
              <OperatorCard
                key={operator.id}
                operator={operator}
                selected={selectedOperator?.id === operator.id}
                loading={loading && selectedOperator?.id === operator.id}
                onGenerate={() => generateBriefing(operator)}
              />
            ))}
          </div>
        )}
      </section>

      {selectedOperator && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Sources</h2>
          <div className="space-y-2">
            {sources.map((source) => (
              <SourceStatus key={source.sourceId} source={source} />
            ))}
          </div>
        </section>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {briefing && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Briefing</h2>
          <BriefingOutput content={briefing} />
        </section>
      )}
    </div>
  );
}
