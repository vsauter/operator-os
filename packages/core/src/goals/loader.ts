/**
 * Goals Loader
 * Loads organization goals from various locations in priority order:
 * 1. ~/.operator/goals.yaml (user-level config)
 * 2. config/goals.yaml (project-level, gitignored)
 * 3. config/goals.example.yaml (template fallback)
 */

import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { resolve, dirname, join } from "path";
import { parse } from "yaml";

export interface Goal {
  id: string;
  description: string;
  metric?: string;
  target?: number;
  deadline?: string;
  priority?: "high" | "medium" | "low";
}

export interface OrganizationConfig {
  name?: string;
  role?: string;
}

export interface GoalsConfig {
  organization?: OrganizationConfig;
  goals?: Goal[];
  context?: string;
}

export interface GoalsLoadResult {
  config: GoalsConfig;
  source: "user" | "project" | "example";
  path: string;
}

/**
 * Find the monorepo/project root by looking for pnpm-workspace.yaml
 */
function findProjectRoot(): string {
  let dir = process.cwd();

  while (true) {
    // Check for pnpm-workspace.yaml (monorepo root)
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    // Check for config directory as backup
    if (existsSync(resolve(dir, "config")) && existsSync(resolve(dir, "connectors"))) {
      return dir;
    }

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return process.cwd();
}

/**
 * Get the user-level config directory (~/.operator/)
 */
function getUserConfigDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return join(home, ".operator");
}

/**
 * Get all possible paths for goals.yaml in priority order
 */
export function getGoalsPaths(): { path: string; source: "user" | "project" | "example" }[] {
  const projectRoot = findProjectRoot();
  const userConfigDir = getUserConfigDir();

  return [
    { path: join(userConfigDir, "goals.yaml"), source: "user" as const },
    { path: resolve(projectRoot, "config/goals.yaml"), source: "project" as const },
    { path: resolve(projectRoot, "config/goals.example.yaml"), source: "example" as const },
  ];
}

/**
 * Load goals configuration from the first available location
 */
export async function loadGoals(): Promise<GoalsConfig | null> {
  const result = await loadGoalsWithSource();
  return result?.config ?? null;
}

/**
 * Load goals configuration with information about where it was loaded from
 */
export async function loadGoalsWithSource(): Promise<GoalsLoadResult | null> {
  const paths = getGoalsPaths();

  for (const { path, source } of paths) {
    if (!existsSync(path)) {
      continue;
    }

    try {
      const content = await readFile(path, "utf-8");
      const config = parse(content) as GoalsConfig;
      return { config, source, path };
    } catch (error) {
      console.warn(`Failed to load goals from ${path}:`, error);
      continue;
    }
  }

  return null;
}

/**
 * Get the path where project-level goals should be saved
 */
export function getProjectGoalsPath(): string {
  const projectRoot = findProjectRoot();
  return resolve(projectRoot, "config/goals.yaml");
}

/**
 * Format goals into a string for injection into prompts
 */
export function formatGoalsForPrompt(config: GoalsConfig): string {
  const parts: string[] = [];

  // Organization header
  if (config.organization?.name || config.organization?.role) {
    const org = config.organization;
    if (org.name && org.role) {
      parts.push(`## Organization Context\n**${org.name}** - ${org.role}`);
    } else if (org.name) {
      parts.push(`## Organization Context\n**${org.name}**`);
    } else if (org.role) {
      parts.push(`## Organization Context\n**Role:** ${org.role}`);
    }
  }

  // Goals list
  if (config.goals && config.goals.length > 0) {
    parts.push("\n## Strategic Goals");

    const sortedGoals = [...config.goals].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority ?? "medium"];
      const bPriority = priorityOrder[b.priority ?? "medium"];
      return aPriority - bPriority;
    });

    for (const goal of sortedGoals) {
      let goalLine = `- **${goal.description}**`;

      const details: string[] = [];
      if (goal.target) {
        details.push(`Target: ${formatNumber(goal.target)}`);
      }
      if (goal.deadline) {
        details.push(`Deadline: ${goal.deadline}`);
      }
      if (goal.priority) {
        details.push(`Priority: ${goal.priority}`);
      }

      if (details.length > 0) {
        goalLine += ` (${details.join(", ")})`;
      }

      parts.push(goalLine);
    }
  }

  // Custom context
  if (config.context) {
    parts.push(`\n## Additional Context\n${config.context.trim()}`);
  }

  return parts.join("\n");
}

/**
 * Format large numbers with commas and currency
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(0)}K`;
  }
  return num.toLocaleString();
}

/**
 * Load goals and format them for prompt injection
 */
export async function getGoalsContext(): Promise<string | null> {
  const config = await loadGoals();
  if (!config) {
    return null;
  }
  return formatGoalsForPrompt(config);
}
