"use client";

import { OperatorTask } from "@/lib/operatorSchema";

interface TaskEditorProps {
  tasks: Record<string, OperatorTask>;
  onChange: (tasks: Record<string, OperatorTask>) => void;
}

function createEmptyTask(): OperatorTask {
  return {
    name: "",
    prompt: "",
    default: false,
  };
}

export default function TaskEditor({ tasks, onChange }: TaskEditorProps) {
  const taskEntries = Object.entries(tasks);

  const updateTask = (key: string, updates: Partial<OperatorTask>) => {
    onChange({
      ...tasks,
      [key]: { ...tasks[key], ...updates },
    });
  };

  const updateTaskKey = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    const newTasks: Record<string, OperatorTask> = {};
    for (const [k, v] of Object.entries(tasks)) {
      if (k === oldKey) {
        newTasks[newKey] = v;
      } else {
        newTasks[k] = v;
      }
    }
    onChange(newTasks);
  };

  const addTask = () => {
    const newKey = `task_${Date.now()}`;
    onChange({
      ...tasks,
      [newKey]: createEmptyTask(),
    });
  };

  const removeTask = (key: string) => {
    const { [key]: _, ...rest } = tasks;
    onChange(rest);
  };

  const setDefaultTask = (targetKey: string) => {
    const newTasks: Record<string, OperatorTask> = {};
    for (const [k, v] of Object.entries(tasks)) {
      newTasks[k] = { ...v, default: k === targetKey };
    }
    onChange(newTasks);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Tasks</h3>
        <button
          type="button"
          onClick={addTask}
          className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
        >
          + Add Task
        </button>
      </div>

      {taskEntries.length === 0 && (
        <p className="text-gray-500 text-sm">No tasks added yet.</p>
      )}

      {taskEntries.map(([key, task]) => (
        <div key={key} className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-gray-700">Task</span>
            <button
              type="button"
              onClick={() => removeTask(key)}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              Remove
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Key</label>
              <input
                type="text"
                value={key}
                onChange={(e) => updateTaskKey(key, e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="briefing"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Name</label>
              <input
                type="text"
                value={task.name}
                onChange={(e) => updateTask(key, { name: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Daily Briefing"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Prompt</label>
            <textarea
              value={task.prompt}
              onChange={(e) => updateTask(key, { prompt: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm h-32 resize-y"
              placeholder="Enter the prompt for this task..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`default-${key}`}
              checked={task.default || false}
              onChange={(e) => {
                if (e.target.checked) {
                  setDefaultTask(key);
                } else {
                  updateTask(key, { default: false });
                }
              }}
              className="rounded"
            />
            <label htmlFor={`default-${key}`} className="text-sm text-gray-600">
              Default task
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}
