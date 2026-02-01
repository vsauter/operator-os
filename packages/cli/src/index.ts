#!/usr/bin/env node
import { Command } from "commander";
import { briefingCommand } from "./commands/briefing.js";

const program = new Command();

program
  .name("operator")
  .description("MCP orchestration for AI briefings")
  .version("0.1.0");

program
  .command("briefing")
  .description("Generate a briefing from a persona")
  .argument("<persona>", "Persona name or path to YAML file")
  .option("-v, --verbose", "Show detailed output")
  .action(briefingCommand);

program.parse();
