"use client";

import { useState } from "react";
import Link from "next/link";
import ConfirmDialog from "./ConfirmDialog";

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
  const [deleting, setDeleting] = useState(false);

  const taskEntries = Object.entries(operator.tasks);

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

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Operator"
        message={`Are you sure you want to delete "${operator.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
