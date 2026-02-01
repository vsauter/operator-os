"use client";

import {
  OperatorSource,
  ConnectorOperatorSource,
  LegacyOperatorSource,
  isConnectorSource,
  isLegacySource,
} from "@/lib/operatorSchema";
import TestConnectionButton from "./TestConnectionButton";

interface SourceEditorProps {
  sources: OperatorSource[];
  onChange: (sources: OperatorSource[]) => void;
}

function createEmptyConnectorSource(): ConnectorOperatorSource {
  return {
    connector: "",
    fetch: "",
  };
}

function createEmptyLegacySource(): LegacyOperatorSource {
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
    newSources[index] = { ...newSources[index], ...updates } as OperatorSource;
    onChange(newSources);
  };

  const updateLegacyConnection = (
    index: number,
    updates: Partial<LegacyOperatorSource["connection"]>
  ) => {
    const source = sources[index];
    if (!isLegacySource(source)) return;

    const newSources = [...sources];
    newSources[index] = {
      ...source,
      connection: { ...source.connection, ...updates },
    };
    onChange(newSources);
  };

  const addConnectorSource = () => {
    onChange([...sources, createEmptyConnectorSource()]);
  };

  const addLegacySource = () => {
    onChange([...sources, createEmptyLegacySource()]);
  };

  const removeSource = (index: number) => {
    onChange(sources.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Sources</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addConnectorSource}
            className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded"
          >
            + Connector Source
          </button>
          <button
            type="button"
            onClick={addLegacySource}
            className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
          >
            + Custom Source
          </button>
        </div>
      </div>

      {sources.length === 0 && (
        <p className="text-gray-500 text-sm">No sources added yet.</p>
      )}

      {sources.map((source, index) => (
        <div key={index} className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-gray-700">
              {isConnectorSource(source) ? (
                <span className="inline-flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                    Connector
                  </span>
                  Source {index + 1}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs">
                    Custom
                  </span>
                  Source {index + 1}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => removeSource(index)}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              Remove
            </button>
          </div>

          {isConnectorSource(source) ? (
            // Connector-based source UI
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Connector
                  </label>
                  <input
                    type="text"
                    value={source.connector}
                    onChange={(e) =>
                      updateSource(index, { connector: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="hubspot, gong, linear..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Fetch
                  </label>
                  <input
                    type="text"
                    value={source.fetch}
                    onChange={(e) =>
                      updateSource(index, { fetch: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="open_deals, recent_calls..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    ID (optional)
                  </label>
                  <input
                    type="text"
                    value={source.id ?? ""}
                    onChange={(e) =>
                      updateSource(index, {
                        id: e.target.value || undefined,
                      })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Auto-generated from connector-fetch"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Name (optional)
                  </label>
                  <input
                    type="text"
                    value={source.name ?? ""}
                    onChange={(e) =>
                      updateSource(index, {
                        name: e.target.value || undefined,
                      })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Auto-generated from connector"
                  />
                </div>
              </div>
            </div>
          ) : isLegacySource(source) ? (
            // Legacy source UI
            <div className="space-y-3">
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
                  <label className="block text-sm text-gray-600 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={source.name}
                    onChange={(e) =>
                      updateSource(index, { name: e.target.value })
                    }
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
                      updateLegacyConnection(index, { command: e.target.value })
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
                      updateLegacyConnection(index, {
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
                  onChange={(e) =>
                    updateSource(index, { tool: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="tool_name"
                />
              </div>

              {source.connection.command && source.tool && (
                <div className="pt-2 border-t border-gray-200">
                  <TestConnectionButton
                    connection={source.connection}
                    tool={source.tool}
                    args={source.args}
                  />
                </div>
              )}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
