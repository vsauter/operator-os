import { NextResponse } from "next/server";
import { readdir, readFile, writeFile, access } from "fs/promises";
import { parse, stringify } from "yaml";
import { join } from "path";
import { validateOperator } from "@/lib/operatorSchema";

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { yaml: yamlContent } = body;

    if (!yamlContent || typeof yamlContent !== "string") {
      return NextResponse.json({ error: "YAML content is required" }, { status: 400 });
    }

    let config;
    try {
      config = parse(yamlContent);
    } catch {
      return NextResponse.json({ error: "Invalid YAML syntax" }, { status: 400 });
    }

    const errors = validateOperator(config);
    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const operatorsDir = join(process.cwd(), "..", "..", "config", "operators", "examples");
    const filePath = join(operatorsDir, `${config.id}.yaml`);

    // Check if file already exists
    try {
      await access(filePath);
      return NextResponse.json(
        { error: `Operator with ID "${config.id}" already exists` },
        { status: 409 }
      );
    } catch {
      // File doesn't exist, which is what we want
    }

    await writeFile(filePath, yamlContent, "utf-8");

    return NextResponse.json({ success: true, id: config.id });
  } catch (error) {
    console.error("Failed to create operator:", error);
    return NextResponse.json({ error: "Failed to create operator" }, { status: 500 });
  }
}
