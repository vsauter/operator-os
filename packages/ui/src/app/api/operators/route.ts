import { NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { parse } from "yaml";
import { join } from "path";

interface RawConfig {
  id: string;
  name: string;
  description?: string;
  sources: { id: string; name: string }[];
  tasks?: Record<string, { name: string; prompt: string; default?: boolean }>;
  briefing?: { prompt: string };
}

export async function GET() {
  try {
    const operatorsDir = join(process.cwd(), "..", "..", "config", "operators", "examples");
    const files = await readdir(operatorsDir);
    const yamlFiles = files.filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

    const operators = await Promise.all(
      yamlFiles.map(async (file) => {
        const content = await readFile(join(operatorsDir, file), "utf-8");
        const config = parse(content) as RawConfig;

        // Handle backward compatibility
        let tasks: Record<string, { name: string; default?: boolean }>;
        if (config.tasks) {
          tasks = Object.fromEntries(
            Object.entries(config.tasks).map(([id, task]) => [
              id,
              { name: task.name, default: task.default },
            ])
          );
        } else if (config.briefing) {
          tasks = {
            briefing: { name: "Briefing", default: true },
          };
        } else {
          tasks = {};
        }

        return {
          id: config.id,
          name: config.name,
          description: config.description,
          sources: config.sources.map((s) => ({
            id: s.id,
            name: s.name,
          })),
          tasks,
        };
      })
    );

    return NextResponse.json({ operators });
  } catch (error) {
    console.error("Failed to load operators:", error);
    return NextResponse.json({ error: "Failed to load operators" }, { status: 500 });
  }
}
