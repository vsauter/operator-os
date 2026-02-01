"use client";

import { OperatorSource } from "@/lib/operatorSchema";

interface SourceEditorProps {
  sources: OperatorSource[];
  onChange: (sources: OperatorSource[]) => void;
}

function createEmptySource(): OperatorSource {
  return {
    id: "",
    name: "",
    connection: {
      command: "",
      args: [],
    },
    tool: "",
  };
}

export default function SourceEditor({ sources, onChange }: SourceEditorProps) {
  const updateSource = (index: number, updates: Partial<OperatorSource>) => {
    const newSources = [...sources];
    newSources[index] = { ...newSources[index], ...updates };
    onChange(newSources);
  };

  const updateConnection = (
    index: number,
    updates: Partial<OperatorSource["connection"]>
  ) => {
    const newSources = [...sources];
    newSources[index] = {
      ...newSources[index],
      connection: { ...newSources[index].connection, ...updates },
    };
    onChange(newSources);
  };

  const addSource = () => {
    onChange([...sources, createEmptySource()]);
  };

  const removeSource = (index: number) => {
    onChange(sources.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Sources</h3>
        <button
          type="button"
          onClick={addSource}
          className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
        >
          + Add Source
        </button>
      </div>

      {sources.length === 0 && (
        <p className="text-gray-500 text-sm">No sources added yet.</p>
      )}

      {sources.map((source, index) => (
        <div key={index} className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-gray-700">
              Source {index + 1}
            </span>
            <button
              type="button"
              onClick={() => removeSource(index)}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              Remove
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">ID</label>
              <input
                type="text"
                value={source.id}
                onChange={(e) => updateSource(index, { id: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="my-source"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Name</label>
              <input
                type="text"
                value={source.name}
                onChange={(e) => updateSource(index, { name: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="My Source"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Command
              </label>
              <input
                type="text"
                value={source.connection.command}
                onChange={(e) =>
                  updateConnection(index, { command: e.target.value })
                }
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="npx"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Args (comma-separated)
              </label>
              <input
                type="text"
                value={source.connection.args.join(", ")}
                onChange={(e) =>
                  updateConnection(index, {
                    args: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="-y, mcp-server"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Tool</label>
            <input
              type="text"
              value={source.tool}
              onChange={(e) => updateSource(index, { tool: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="tool_name"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
