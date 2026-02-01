"use client";

import SourceStatus, { SourceStatusProps } from "./SourceStatus";

interface SourceStatusListProps {
  sources: SourceStatusProps[];
  totalDurationMs?: number;
}

export default function SourceStatusList({
  sources,
  totalDurationMs,
}: SourceStatusListProps) {
  const completed = sources.filter(
    (s) => s.status === "success" || s.status === "error" || s.status === "warning"
  ).length;
  const successful = sources.filter((s) => s.status === "success").length;
  const failed = sources.filter((s) => s.status === "error").length;
  const warnings = sources.filter((s) => s.status === "warning").length;
  const loading = sources.some((s) => s.status === "loading");

  const getSummaryText = () => {
    if (loading) {
      return `Loading... (${completed}/${sources.length} complete)`;
    }

    const parts: string[] = [];
    if (successful > 0) {
      parts.push(`${successful} loaded`);
    }
    if (warnings > 0) {
      parts.push(`${warnings} empty`);
    }
    if (failed > 0) {
      parts.push(`${failed} failed`);
    }

    return parts.join(", ");
  };

  const getSummaryColor = () => {
    if (loading) return "text-blue-600";
    if (failed > 0) return "text-red-600";
    if (warnings > 0) return "text-amber-600";
    return "text-green-600";
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {sources.map((source) => (
          <SourceStatus key={source.id} {...source} />
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <p className={`text-sm font-medium ${getSummaryColor()}`}>
          {getSummaryText()}
        </p>
        {totalDurationMs !== undefined && !loading && (
          <p className="text-xs text-gray-500">
            Total: {(totalDurationMs / 1000).toFixed(1)}s
          </p>
        )}
      </div>
    </div>
  );
}
