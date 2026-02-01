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

type GoalsSource = "user" | "project" | "example";

function findProjectRoot(): string {
  let dir = process.cwd();

  while (true) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    if (existsSync(resolve(dir, "config")) && existsSync(resolve(dir, "connectors"))) {
      return dir;
    }

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return process.cwd();
}

function getUserConfigDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return join(home, ".operator");
}

function getGoalsPaths(): { path: string; source: GoalsSource }[] {
  const projectRoot = findProjectRoot();
  const userConfigDir = getUserConfigDir();

  return [
    { path: join(userConfigDir, "goals.yaml"), source: "user" },
    { path: resolve(projectRoot, "config/goals.yaml"), source: "project" },
    { path: resolve(projectRoot, "config/goals.example.yaml"), source: "example" },
  ];
}

function getProjectGoalsPath(): string {
  const projectRoot = findProjectRoot();
  return resolve(projectRoot, "config/goals.yaml");
}

export async function GET() {
  try {
    const paths = getGoalsPaths();

    for (const { path, source } of paths) {
      if (!existsSync(path)) {
        continue;
      }

      try {
        const content = await readFile(path, "utf-8");
        const config = parse(content) as GoalsConfig;

        return NextResponse.json({
          config,
          raw: content,
          source,
          path,
          isExample: source === "example",
          allPaths: paths.map((p) => ({
            ...p,
            exists: existsSync(p.path),
          })),
        });
      } catch {
        continue;
      }
    }

    // No config found anywhere
    return NextResponse.json({
      config: {
        organization: { name: "", role: "" },
        goals: [],
        context: "",
      },
      raw: "",
      source: null,
      path: null,
      isExample: false,
      allPaths: paths.map((p) => ({
        ...p,
        exists: existsSync(p.path),
      })),
    });
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
    const { raw } = await request.json();

    if (!raw || typeof raw !== "string") {
      return NextResponse.json(
        { error: "Raw YAML content is required" },
        { status: 400 }
      );
    }

    // Validate YAML syntax
    try {
      parse(raw);
    } catch (parseError) {
      return NextResponse.json(
        { error: `Invalid YAML: ${parseError instanceof Error ? parseError.message : "Parse error"}` },
        { status: 400 }
      );
    }

    // Always save to project-level config/goals.yaml (gitignored)
    const goalsPath = getProjectGoalsPath();
    const configDir = dirname(goalsPath);

    // Ensure config directory exists
    if (!existsSync(configDir)) {
      await mkdir(configDir, { recursive: true });
    }

    await writeFile(goalsPath, raw, "utf-8");

    return NextResponse.json({
      success: true,
      path: goalsPath,
      source: "project",
    });
  } catch (error) {
    console.error("Failed to save goals:", error);
    return NextResponse.json(
      { error: "Failed to save goals configuration" },
      { status: 500 }
    );
  }
}
