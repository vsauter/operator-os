/**
 * Goals Loader
 * Loads organization goals from config/goals.yaml
 */

import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
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

/**
 * Find the monorepo/project root by looking for config directory
 */
function findProjectRoot(): string {
  let dir = process.cwd();

  while (true) {
    // Check for config/goals.yaml or config directory
    if (existsSync(resolve(dir, "config/goals.yaml"))) {
      return dir;
    }
    if (existsSync(resolve(dir, "config"))) {
      return dir;
    }
    // Check for pnpm-workspace.yaml (monorepo root)
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return process.cwd();
}

/**
 * Load goals configuration from config/goals.yaml
 */
export async function loadGoals(): Promise<GoalsConfig | null> {
  const projectRoot = findProjectRoot();
  const goalsPath = resolve(projectRoot, "config/goals.yaml");

  if (!existsSync(goalsPath)) {
    return null;
  }

  try {
    const content = await readFile(goalsPath, "utf-8");
    const config = parse(content) as GoalsConfig;
    return config;
  } catch (error) {
    console.warn("Failed to load goals.yaml:", error);
    return null;
  }
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
