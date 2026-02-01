"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface FetchInfo {
  id: string;
  tool?: string;
  endpoint?: string;
  description?: string;
  params?: Record<string, unknown>;
}

interface AuthField {
  name: string;
  label: string;
  type: string;
  envVar: string;
}

interface ConnectorInfo {
  id: string;
  name: string;
  type: "mcp" | "api";
  description?: string;
  fetches: FetchInfo[];
  auth?: {
    type: string;
    fields: AuthField[];
  };
}

interface GoalsConfig {
  organization?: {
    name?: string;
    role?: string;
  };
  goals?: {
    id: string;
    description: string;
    metric?: string;
    target?: number;
    deadline?: string;
    priority?: "high" | "medium" | "low";
  }[];
  context?: string;
}

type Tab = "connectors" | "goals";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("connectors");
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [goalsYaml, setGoalsYaml] = useState("");
  const [goalsExists, setGoalsExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expandedConnector, setExpandedConnector] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [connectorsRes, goalsRes] = await Promise.all([
        fetch("/api/connectors"),
        fetch("/api/goals"),
      ]);

      if (connectorsRes.ok) {
        const data = await connectorsRes.json();
        setConnectors(data.connectors || []);
      }

      if (goalsRes.ok) {
        const data = await goalsRes.json();
        setGoalsYaml(data.raw || "");
        setGoalsExists(data.exists || false);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveGoals() {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: goalsYaml }),
      });

      if (res.ok) {
        setSaveMessage({ type: "success", text: "Goals saved successfully!" });
        setGoalsExists(true);
      } else {
        const data = await res.json();
        setSaveMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch (error) {
      setSaveMessage({ type: "error", text: "Failed to save goals" });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  }

  function toggleConnector(id: string) {
    setExpandedConnector(expandedConnector === id ? null : id);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              &larr; Back
            </Link>
            <h1 className="text-xl font-semibold">Settings</h1>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-8">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab("connectors")}
              className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "connectors"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Connectors
            </button>
            <button
              onClick={() => setActiveTab("goals")}
              className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "goals"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Organization Goals
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-8 py-8">
        {activeTab === "connectors" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Available Connectors</h2>
                <p className="text-sm text-gray-500">
                  {connectors.length} connector{connectors.length !== 1 ? "s" : ""} configured
                </p>
              </div>
            </div>

            {connectors.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No connectors found.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Add connector YAML files to the <code className="bg-gray-100 px-1 rounded">connectors/</code> directory.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {connectors.map((connector) => (
                  <div
                    key={connector.id}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleConnector(connector.id)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            connector.type === "mcp"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {connector.type.toUpperCase()}
                        </span>
                        <div className="text-left">
                          <h3 className="font-medium">{connector.name}</h3>
                          {connector.description && (
                            <p className="text-sm text-gray-500">{connector.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-400">
                          {connector.fetches.length} fetch{connector.fetches.length !== 1 ? "es" : ""}
                        </span>
                        <span className="text-gray-400">
                          {expandedConnector === connector.id ? "▲" : "▼"}
                        </span>
                      </div>
                    </button>

                    {expandedConnector === connector.id && (
                      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                        {/* Auth Fields */}
                        {connector.auth && connector.auth.fields.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              Required Environment Variables
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {connector.auth.fields.map((field) => (
                                <code
                                  key={field.name}
                                  className="bg-gray-200 px-2 py-1 rounded text-xs"
                                >
                                  {field.envVar}
                                </code>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Fetches */}
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Available Fetches
                        </h4>
                        <div className="space-y-2">
                          {connector.fetches.map((fetch) => (
                            <div
                              key={fetch.id}
                              className="bg-white rounded border border-gray-200 px-4 py-3"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <code className="text-sm font-medium text-blue-600">
                                    {fetch.id}
                                  </code>
                                  {fetch.description && (
                                    <p className="text-sm text-gray-500 mt-1">
                                      {fetch.description}
                                    </p>
                                  )}
                                </div>
                                {(fetch.tool || fetch.endpoint) && (
                                  <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                                    {fetch.tool || fetch.endpoint}
                                  </code>
                                )}
                              </div>
                              {fetch.params && Object.keys(fetch.params).length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {Object.entries(fetch.params).map(([name, def]) => (
                                    <span
                                      key={name}
                                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                                    >
                                      {name}
                                      {(def as Record<string, unknown>)?.required && (
                                        <span className="text-red-500">*</span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Usage Example */}
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            Usage in Operator
                          </h4>
                          <pre className="bg-gray-800 text-gray-100 rounded p-3 text-xs overflow-x-auto">
{`sources:
  - connector: ${connector.id}
    fetch: ${connector.fetches[0]?.id || "fetch_name"}`}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "goals" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Organization Goals</h2>
                <p className="text-sm text-gray-500">
                  Define goals that are automatically included in all operator briefings
                </p>
              </div>
              <div className="flex items-center gap-3">
                {saveMessage && (
                  <span
                    className={`text-sm ${
                      saveMessage.type === "success" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {saveMessage.text}
                  </span>
                )}
                <button
                  onClick={saveGoals}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {saving ? "Saving..." : "Save Goals"}
                </button>
              </div>
            </div>

            {!goalsExists && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  No goals.yaml file exists yet. Edit the configuration below and save to create one.
                </p>
              </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">config/goals.yaml</span>
                <a
                  href="https://yaml.org/spec/1.2.2/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  YAML Reference
                </a>
              </div>
              <textarea
                value={goalsYaml}
                onChange={(e) => setGoalsYaml(e.target.value)}
                placeholder={`# Organization Goals Configuration
# These goals are automatically injected into all operator briefings

organization:
  name: "Your Company"
  role: "Your Role"

goals:
  - id: goal-1
    description: "Your first goal"
    priority: high
    deadline: 2026-12-31

context: |
  Additional context for all briefings...`}
                className="w-full h-96 p-4 font-mono text-sm resize-none focus:outline-none"
                spellCheck={false}
              />
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Goals Schema</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <p><code className="bg-gray-200 px-1 rounded">organization.name</code> - Your company name</p>
                <p><code className="bg-gray-200 px-1 rounded">organization.role</code> - Your role (e.g., "Delivery Manager")</p>
                <p><code className="bg-gray-200 px-1 rounded">goals[].id</code> - Unique identifier for the goal</p>
                <p><code className="bg-gray-200 px-1 rounded">goals[].description</code> - Goal description</p>
                <p><code className="bg-gray-200 px-1 rounded">goals[].target</code> - Numeric target (optional)</p>
                <p><code className="bg-gray-200 px-1 rounded">goals[].deadline</code> - Target date (YYYY-MM-DD)</p>
                <p><code className="bg-gray-200 px-1 rounded">goals[].priority</code> - high, medium, or low</p>
                <p><code className="bg-gray-200 px-1 rounded">context</code> - Free-form text included in all briefings</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
