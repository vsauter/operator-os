// Legacy source format (direct MCP connection)
export interface LegacyOperatorSource {
  id: string;
  name: string;
  connection: {
    command: string;
    args: string[];
    env?: Record<string, string>;
  };
  tool: string;
  args?: Record<string, unknown>;
}

// New connector-based source format
export interface ConnectorOperatorSource {
  connector: string;
  fetch: string;
  id?: string;
  name?: string;
  params?: Record<string, unknown>;
}

// Union type for both formats
export type OperatorSource = LegacyOperatorSource | ConnectorOperatorSource;

// Type guards
export function isConnectorSource(source: OperatorSource): source is ConnectorOperatorSource {
  return "connector" in source && "fetch" in source;
}

export function isLegacySource(source: OperatorSource): source is LegacyOperatorSource {
  return "connection" in source && "tool" in source;
}

export interface OperatorTask {
  name: string;
  prompt: string;
  default?: boolean;
}

export interface OperatorConfig {
  id: string;
  name: string;
  description?: string;
  sources: OperatorSource[];
  tasks: Record<string, OperatorTask>;
}

export interface ValidationError {
  field: string;
  message: string;
}

const ID_PATTERN = /^[a-z0-9-]+$/;

export function validateOperator(config: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!config || typeof config !== "object") {
    errors.push({ field: "root", message: "Config must be an object" });
    return errors;
  }

  const c = config as Record<string, unknown>;

  // Validate id
  if (!c.id) {
    errors.push({ field: "id", message: "ID is required" });
  } else if (typeof c.id !== "string") {
    errors.push({ field: "id", message: "ID must be a string" });
  } else if (!ID_PATTERN.test(c.id)) {
    errors.push({
      field: "id",
      message: "ID must contain only lowercase letters, numbers, and hyphens",
    });
  }

  // Validate name
  if (!c.name) {
    errors.push({ field: "name", message: "Name is required" });
  } else if (typeof c.name !== "string" || c.name.trim() === "") {
    errors.push({ field: "name", message: "Name must be a non-empty string" });
  }

  // Validate sources
  if (!c.sources) {
    errors.push({ field: "sources", message: "At least one source is required" });
  } else if (!Array.isArray(c.sources)) {
    errors.push({ field: "sources", message: "Sources must be an array" });
  } else if (c.sources.length === 0) {
    errors.push({ field: "sources", message: "At least one source is required" });
  } else {
    const sourceIds = new Set<string>();
    c.sources.forEach((source: unknown, index: number) => {
      if (!source || typeof source !== "object") {
        errors.push({ field: `sources[${index}]`, message: "Source must be an object" });
        return;
      }

      const s = source as Record<string, unknown>;

      // Check if it's a connector-based source (new format)
      if (s.connector && s.fetch) {
        // New connector format - connector and fetch are required
        if (typeof s.connector !== "string") {
          errors.push({ field: `sources[${index}].connector`, message: "Connector must be a string" });
        }
        if (typeof s.fetch !== "string") {
          errors.push({ field: `sources[${index}].fetch`, message: "Fetch must be a string" });
        }
        // id and name are optional for connector sources
        const sourceId = s.id ?? `${s.connector}-${s.fetch}`;
        if (typeof sourceId === "string" && sourceIds.has(sourceId)) {
          errors.push({ field: `sources[${index}]`, message: `Duplicate source ID: ${sourceId}` });
        }
        if (typeof sourceId === "string") {
          sourceIds.add(sourceId);
        }
      } else {
        // Legacy format - id, name, connection, tool are required
        if (!s.id) {
          errors.push({ field: `sources[${index}].id`, message: "Source ID is required" });
        } else if (typeof s.id === "string") {
          if (sourceIds.has(s.id)) {
            errors.push({ field: `sources[${index}].id`, message: `Duplicate source ID: ${s.id}` });
          }
          sourceIds.add(s.id);
        }

        if (!s.name) {
          errors.push({ field: `sources[${index}].name`, message: "Source name is required" });
        }

        if (!s.connection || typeof s.connection !== "object") {
          errors.push({ field: `sources[${index}].connection`, message: "Source connection is required" });
        } else {
          const conn = s.connection as Record<string, unknown>;
          if (!conn.command) {
            errors.push({ field: `sources[${index}].connection.command`, message: "Connection command is required" });
          }
          if (!conn.args || !Array.isArray(conn.args)) {
            errors.push({ field: `sources[${index}].connection.args`, message: "Connection args must be an array" });
          }
        }

        if (!s.tool) {
          errors.push({ field: `sources[${index}].tool`, message: "Source tool is required" });
        }
      }
    });
  }

  // Validate tasks
  if (!c.tasks) {
    errors.push({ field: "tasks", message: "At least one task is required" });
  } else if (typeof c.tasks !== "object" || Array.isArray(c.tasks)) {
    errors.push({ field: "tasks", message: "Tasks must be an object" });
  } else {
    const tasks = c.tasks as Record<string, unknown>;
    const taskKeys = Object.keys(tasks);

    if (taskKeys.length === 0) {
      errors.push({ field: "tasks", message: "At least one task is required" });
    }

    taskKeys.forEach((key) => {
      const task = tasks[key];
      if (!task || typeof task !== "object") {
        errors.push({ field: `tasks.${key}`, message: "Task must be an object" });
        return;
      }

      const t = task as Record<string, unknown>;

      if (!t.name) {
        errors.push({ field: `tasks.${key}.name`, message: "Task name is required" });
      }

      if (!t.prompt) {
        errors.push({ field: `tasks.${key}.prompt`, message: "Task prompt is required" });
      }
    });
  }

  return errors;
}
