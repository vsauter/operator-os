#!/usr/bin/env node
import { Command } from "commander";
import { runCommand } from "./commands/run.js";
import { devCommand } from "./commands/dev.js";

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
  .action(runCommand);

program
  .command("dev")
  .description("Start the web UI")
  .option("-p, --port <port>", "Port to run on", "3000")
  .action(devCommand);

program.parse();
