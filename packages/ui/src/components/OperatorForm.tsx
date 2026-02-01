"use client";

import { useState, useEffect } from "react";
import { parse, stringify } from "yaml";
import YamlEditor from "./YamlEditor";
import SourceEditor from "./SourceEditor";
import TaskEditor from "./TaskEditor";
import {
  OperatorConfig,
  OperatorSource,
  OperatorTask,
  validateOperator,
  ValidationError,
} from "@/lib/operatorSchema";

type EditorMode = "visual" | "yaml";

interface OperatorFormProps {
  initialYaml?: string;
  isNew: boolean;
  onSave: (yaml: string) => Promise<void>;
  saving?: boolean;
}

const DEFAULT_CONFIG: OperatorConfig = {
  id: "",
  name: "",
  description: "",
  sources: [],
  tasks: {},
};

function configToYaml(config: OperatorConfig): string {
  return stringify(config, { lineWidth: 0 });
}

function yamlToConfig(yaml: string): OperatorConfig | null {
  try {
    const parsed = parse(yaml);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      id: parsed.id || "",
      name: parsed.name || "",
      description: parsed.description || "",
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      tasks: parsed.tasks && typeof parsed.tasks === "object" ? parsed.tasks : {},
    };
  } catch {
    return null;
  }
}

export default function OperatorForm({
  initialYaml,
  isNew,
  onSave,
  saving = false,
}: OperatorFormProps) {
  const [mode, setMode] = useState<EditorMode>("visual");
  const [yaml, setYaml] = useState(initialYaml || configToYaml(DEFAULT_CONFIG));
  const [config, setConfig] = useState<OperatorConfig>(
    yamlToConfig(initialYaml || "") || DEFAULT_CONFIG
  );
  const [yamlError, setYamlError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  useEffect(() => {
    if (initialYaml) {
      setYaml(initialYaml);
      const parsed = yamlToConfig(initialYaml);
      if (parsed) {
        setConfig(parsed);
      }
    }
  }, [initialYaml]);

  const switchToYaml = () => {
    setYaml(configToYaml(config));
    setYamlError(null);
    setMode("yaml");
  };

  const switchToVisual = () => {
    const parsed = yamlToConfig(yaml);
    if (parsed) {
      setConfig(parsed);
      setYamlError(null);
      setMode("visual");
    } else {
      setYamlError("Cannot switch to Visual mode: Invalid YAML syntax");
    }
  };

  const handleYamlChange = (newYaml: string) => {
    setYaml(newYaml);
    setYamlError(null);
  };

  const updateConfig = (updates: Partial<OperatorConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    let finalYaml = yaml;

    if (mode === "visual") {
      finalYaml = configToYaml(config);
    }

    // Parse and validate
    let parsed;
    try {
      parsed = parse(finalYaml);
    } catch {
      setYamlError("Invalid YAML syntax");
      return;
    }

    const errors = validateOperator(parsed);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    await onSave(finalYaml);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b">
        <button
          type="button"
          onClick={switchToVisual}
          className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px ${
            mode === "visual"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Visual
        </button>
        <button
          type="button"
          onClick={switchToYaml}
          className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px ${
            mode === "yaml"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          YAML
        </button>
      </div>

      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <h4 className="font-medium text-red-800 mb-2">Validation Errors</h4>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {validationErrors.map((error, i) => (
              <li key={i}>
                <strong>{error.field}:</strong> {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {mode === "visual" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID
              </label>
              <input
                type="text"
                value={config.id}
                onChange={(e) => updateConfig({ id: e.target.value })}
                disabled={!isNew}
                className={`w-full border rounded px-3 py-2 ${
                  !isNew ? "bg-gray-100 text-gray-500" : ""
                }`}
                placeholder="my-operator"
              />
              {!isNew && (
                <p className="text-xs text-gray-500 mt-1">
                  ID cannot be changed after creation
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => updateConfig({ name: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="My Operator"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={config.description || ""}
              onChange={(e) => updateConfig({ description: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="A brief description of what this operator does"
            />
          </div>

          <SourceEditor
            sources={config.sources}
            onChange={(sources: OperatorSource[]) => updateConfig({ sources })}
          />

          <TaskEditor
            tasks={config.tasks}
            onChange={(tasks: Record<string, OperatorTask>) =>
              updateConfig({ tasks })
            }
          />
        </div>
      ) : (
        <YamlEditor value={yaml} onChange={handleYamlChange} error={yamlError} />
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-2 rounded font-medium ${
            saving
              ? "bg-blue-400 text-white cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {saving ? "Saving..." : "Save Operator"}
        </button>
      </div>
    </div>
  );
}
