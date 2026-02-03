#!/usr/bin/env node
import { config } from "dotenv";
import { resolve } from "path";
import { Command } from "commander";
import { runCommand } from "./commands/run.js";
import { devCommand } from "./commands/dev.js";

// Load .env.local from project root
config({ path: resolve(process.cwd(), ".env.local") });

const program = new Command();

program
  .name("operator")
  .description("MCP orchestration for AI briefings")
  .version("0.1.0");

program
  .command("run")
  .description("Run an operator task")
  .argument("<operator>", "Operator name or path to YAML file")
  .argument("[task]", "Task to run (defaults to default task)")
  .option("-v, --verbose", "Show detailed output")
  .option("-l, --list", "List available tasks")
  .option("-c, --chat", "Enter interactive chat mode after running")
  .option("-p, --param <key=value>", "Set runtime parameter (can be used multiple times)", collectParams, {})
  .action(runCommand);

// Helper to collect multiple --param options into an object
function collectParams(value: string, previous: Record<string, string>): Record<string, string> {
  const [key, ...rest] = value.split("=");
  if (key && rest.length > 0) {
    previous[key] = rest.join("="); // Rejoin in case value contains "="
  }
  return previous;
}

program
  .command("dev")
  .description("Start the web UI")
  .option("-p, --port <port>", "Port to run on", "3000")
  .action(devCommand);

program.parse();
