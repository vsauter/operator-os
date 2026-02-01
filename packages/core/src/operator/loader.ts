import { readFile } from "fs/promises";
import { parse } from "yaml";
import { resolve } from "path";
import type { OperatorConfig } from "../types";

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
  const config = parse(content) as OperatorConfig;

  for (const source of config.sources) {
    if (source.connection.env) {
      for (const [key, value] of Object.entries(source.connection.env)) {
        if (typeof value === "string" && value.startsWith("$")) {
          const envVar = value.slice(1);
          source.connection.env[key] = process.env[envVar] || "";
        }
      }
    }
  }

  return config;
}
