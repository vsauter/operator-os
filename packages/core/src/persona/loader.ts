import { readFile } from "fs/promises";
import { parse } from "yaml";
import { resolve } from "path";
import type { PersonaConfig } from "../types.js";

export async function loadPersona(nameOrPath: string): Promise<PersonaConfig> {
  let filePath: string | undefined;

  if (nameOrPath.endsWith(".yaml") || nameOrPath.endsWith(".yml")) {
    filePath = resolve(nameOrPath);
  } else {
    const locations = [
      `./config/personas/examples/${nameOrPath}.yaml`,
      `./config/personas/${nameOrPath}.yaml`,
      `~/.operator/personas/${nameOrPath}.yaml`,
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
      throw new Error(`Persona not found: ${nameOrPath}`);
    }
  }

  const content = await readFile(filePath, "utf-8");
  const config = parse(content) as PersonaConfig;

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
