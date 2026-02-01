import { readFile } from "fs/promises";
import { parse } from "yaml";
import { resolve } from "path";
import type { OperatorConfig, Task } from "../types";

interface RawOperatorConfig {
  id: string;
  name: string;
  description?: string;
  sources: OperatorConfig["sources"];
  tasks?: Record<string, Task>;
  briefing?: { prompt: string };
}

export async function loadOperator(nameOrPath: string): Promise<OperatorConfig> {
  let filePath: string | undefined;

  if (nameOrPath.endsWith(".yaml") || nameOrPath.endsWith(".yml")) {
    filePath = resolve(nameOrPath);
  } else {
    const locations = [
      `./config/operators/examples/${nameOrPath}.yaml`,
      `./config/operators/${nameOrPath}.yaml`,
      `~/.operator/operators/${nameOrPath}.yaml`,
    ];

    for (const loc of locations) {
      try {
        const resolved = resolve(loc.replace("~", process.env.HOME || ""));
        await readFile(resolved);
        filePath = resolved;
        break;
      } catch {
        continue;
      }
    }

    if (!filePath) {
      throw new Error(`Operator not found: ${nameOrPath}`);
    }
  }

  const content = await readFile(filePath, "utf-8");
  const raw = parse(content) as RawOperatorConfig;

  // Substitute environment variables in sources
  for (const source of raw.sources) {
    if (source.connection.env) {
      for (const [key, value] of Object.entries(source.connection.env)) {
        if (typeof value === "string" && value.startsWith("$")) {
          const envVar = value.slice(1);
          source.connection.env[key] = process.env[envVar] || "";
        }
      }
    }
  }

  // Handle backward compatibility: convert briefing to tasks
  let tasks: Record<string, Task>;
  if (raw.tasks) {
    tasks = raw.tasks;
  } else if (raw.briefing) {
    tasks = {
      briefing: {
        name: "Briefing",
        prompt: raw.briefing.prompt,
        default: true,
      },
    };
  } else {
    tasks = {};
  }

  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    sources: raw.sources,
    tasks,
    briefing: raw.briefing,
  };
}

export function getDefaultTask(config: OperatorConfig): { id: string; task: Task } | null {
  const entries = Object.entries(config.tasks);
  if (entries.length === 0) return null;

  // Find task marked as default
  const defaultEntry = entries.find(([, task]) => task.default);
  if (defaultEntry) {
    return { id: defaultEntry[0], task: defaultEntry[1] };
  }

  // Return first task
  return { id: entries[0][0], task: entries[0][1] };
}

export function getTask(config: OperatorConfig, taskId: string): Task | null {
  return config.tasks[taskId] || null;
}
