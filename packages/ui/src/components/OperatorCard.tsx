"use client";

import { useState } from "react";
import Link from "next/link";
import { parse } from "yaml";
import ConfirmDialog from "./ConfirmDialog";
import ConnectionTestModal from "./ConnectionTestModal";

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

interface FullSource {
  id?: string;
  name?: string;
  connector?: string;
  fetch?: string;
  params?: Record<string, unknown>;
  connection?: {
    command: string;
    args: string[];
    env?: Record<string, string>;
  };
  tool?: string;
  args?: Record<string, unknown>;
}

interface OperatorCardProps {
  operator: Operator;
  selected: boolean;
  loadingTaskId: string | null;
  onRunTask: (taskId: string) => void;
  onDeleted?: () => void;
}

export default function OperatorCard({
  operator,
  selected,
  loadingTaskId,
  onRunTask,
  onDeleted,
}: OperatorCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [fullSources, setFullSources] = useState<FullSource[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);

  const taskEntries = Object.entries(operator.tasks);

  const handleOpenTestModal = async () => {
    setLoadingTest(true);
    try {
      const res = await fetch(`/api/operators/${operator.id}`);
      const data = await res.json();
      if (data.yaml) {
        const config = parse(data.yaml);
        setFullSources(config.sources || []);
        setShowTestModal(true);
      }
    } catch {
      // Handle error silently
    } finally {
      setLoadingTest(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/operators/${operator.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        onDeleted?.();
      }
    } catch {
      // Handle error silently
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div
        className={`border rounded-lg p-4 bg-white ${
          selected ? "ring-2 ring-blue-500" : ""
        }`}
      >
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-lg">{operator.name}</h3>
          <div className="flex gap-2">
            <Link
              href={`/operators/${operator.id}/edit`}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Edit
            </Link>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-500 hover:text-red-700 text-sm"
              disabled={deleting}
            >
              {deleting ? "..." : "Delete"}
            </button>
          </div>
        </div>
        {operator.description && (
          <p className="text-gray-600 text-sm mt-1">{operator.description}</p>
        )}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Sources
            </p>
            <button
              onClick={handleOpenTestModal}
              disabled={loadingTest}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {loadingTest ? "..." : "Test"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {operator.connectors.map((connector) => (
              <span
                key={connector}
                className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
              >
                {connector}
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

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Operator"
        message={`Are you sure you want to delete "${operator.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConnectionTestModal
        open={showTestModal}
        onClose={() => setShowTestModal(false)}
        sources={fullSources}
      />
    </>
  );
}
