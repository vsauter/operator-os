interface Task {
  name: string;
  default?: boolean;
}

interface Operator {
  id: string;
  name: string;
  description?: string;
  sources: { id: string; name: string }[];
  tasks: Record<string, Task>;
}

interface OperatorCardProps {
  operator: Operator;
  selected: boolean;
  loadingTaskId: string | null;
  onRunTask: (taskId: string) => void;
}

export default function OperatorCard({
  operator,
  selected,
  loadingTaskId,
  onRunTask,
}: OperatorCardProps) {
  const taskEntries = Object.entries(operator.tasks);

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
      <div className="mt-4 space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Tasks</p>
        <div className="flex flex-wrap gap-2">
          {taskEntries.map(([taskId, task]) => {
            const isLoading = loadingTaskId === taskId;
            return (
              <button
                key={taskId}
                onClick={() => onRunTask(taskId)}
                disabled={loadingTaskId !== null}
                className={`py-2 px-4 rounded font-medium text-sm transition-colors ${
                  isLoading
                    ? "bg-blue-400 text-white cursor-not-allowed"
                    : loadingTaskId !== null
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isLoading ? "Running..." : task.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
