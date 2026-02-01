interface SourceResult {
  sourceId: string;
  sourceName: string;
  status: "pending" | "loading" | "success" | "error";
  error?: string;
}

interface SourceStatusProps {
  source: SourceResult;
}

export default function SourceStatus({ source }: SourceStatusProps) {
  const statusConfig = {
    pending: { icon: "○", color: "text-gray-400", bg: "bg-gray-50" },
    loading: { icon: "◌", color: "text-blue-500", bg: "bg-blue-50" },
    success: { icon: "✓", color: "text-green-600", bg: "bg-green-50" },
    error: { icon: "✕", color: "text-red-600", bg: "bg-red-50" },
  };

  const config = statusConfig[source.status];

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${config.bg}`}>
      <span className={`text-lg ${config.color}`}>{config.icon}</span>
      <div className="flex-1">
        <p className="font-medium text-sm">{source.sourceName}</p>
        {source.error && (
          <p className="text-xs text-red-600 mt-0.5">{source.error}</p>
        )}
      </div>
      {source.status === "loading" && (
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
}
