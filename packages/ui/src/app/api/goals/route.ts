import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { parse, stringify } from "yaml";

interface Goal {
  id: string;
  description: string;
  metric?: string;
  target?: number;
  deadline?: string;
  priority?: "high" | "medium" | "low";
}

interface GoalsConfig {
  organization?: {
    name?: string;
    role?: string;
  };
  goals?: Goal[];
  context?: string;
}

function findProjectRoot(): string {
  let dir = process.cwd();

  // First try walking up from cwd
  while (true) {
    if (existsSync(resolve(dir, "config"))) {
      return dir;
    }
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Fallback: check relative paths from cwd (for Next.js context)
  const relativePaths = ["../..", "../../../"];
  for (const rel of relativePaths) {
    const testPath = resolve(process.cwd(), rel);
    if (existsSync(resolve(testPath, "config"))) {
      return testPath;
    }
  }

  return process.cwd();
}

function getGoalsPath(): string {
  const projectRoot = findProjectRoot();
  return join(projectRoot, "config", "goals.yaml");
}

export async function GET() {
  try {
    const goalsPath = getGoalsPath();

    if (!existsSync(goalsPath)) {
      // Return default empty config
      return NextResponse.json({
        config: {
          organization: { name: "", role: "" },
          goals: [],
          context: "",
        },
        exists: false,
      });
    }

    const content = await readFile(goalsPath, "utf-8");
    const config = parse(content) as GoalsConfig;

    return NextResponse.json({ config, exists: true, raw: content });
  } catch (error) {
    console.error("Failed to load goals:", error);
    return NextResponse.json(
      { error: "Failed to load goals configuration" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { config, raw } = await request.json();

    const goalsPath = getGoalsPath();
    const configDir = dirname(goalsPath);

    // Ensure config directory exists
    if (!existsSync(configDir)) {
      await mkdir(configDir, { recursive: true });
    }

    // If raw YAML is provided, use it directly; otherwise stringify the config
    let content: string;
    if (raw && typeof raw === "string") {
      content = raw;
    } else if (config) {
      content = stringify(config, { lineWidth: 0 });
    } else {
      return NextResponse.json(
        { error: "Either config or raw YAML must be provided" },
        { status: 400 }
      );
    }

    await writeFile(goalsPath, content, "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save goals:", error);
    return NextResponse.json(
      { error: "Failed to save goals configuration" },
      { status: 500 }
    );
  }
}
