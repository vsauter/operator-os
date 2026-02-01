interface Operator {
  id: string;
  name: string;
  description?: string;
  sources: { id: string; name: string }[];
}

interface OperatorCardProps {
  operator: Operator;
  selected: boolean;
  loading: boolean;
  onGenerate: () => void;
}

export default function OperatorCard({
  operator,
  selected,
  loading,
  onGenerate,
}: OperatorCardProps) {
  return (
    <div
      className={`border rounded-lg p-4 bg-white ${
        selected ? "ring-2 ring-blue-500" : ""
      }`}
    >
      <h3 className="font-semibold text-lg">{operator.name}</h3>
      {operator.description && (
        <p className="text-gray-600 text-sm mt-1">{operator.description}</p>
      )}
      <div className="mt-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
          Sources
        </p>
        <div className="flex flex-wrap gap-1">
          {operator.sources.map((source) => (
            <span
              key={source.id}
              className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
            >
              {source.name}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={onGenerate}
        disabled={loading}
        className={`mt-4 w-full py-2 px-4 rounded font-medium transition-colors ${
          loading
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {loading ? "Running..." : "Run Operator"}
      </button>
    </div>
  );
}
