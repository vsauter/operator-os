# OperatorOS MVP Spec

Build a CLI that pulls context from MCP servers and generates AI briefings.

## Goal

```bash
npx operator briefing --persona sales-starter
```

Outputs a useful daily briefing synthesized from real data.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                         CLI                             │
│                   (briefing command)                    │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Persona Loader                        │
│              (reads YAML config files)                  │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 Context Aggregator                      │
│         (parallel fetch from MCP servers)               │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Briefing Builder                       │
│            (synthesize with Claude API)                 │
└─────────────────────────────────────────────────────────┘
```

## File Structure

```
operator-os/
├── packages/
│   └── core/
│       └── src/
│           ├── mcp/
│           │   └── client.ts        # MCP connection + tool calls
│           ├── context/
│           │   └── aggregator.ts    # Parallel fetch from sources
│           ├── briefing/
│           │   └── builder.ts       # Claude API synthesis
│           ├── persona/
│           │   └── loader.ts        # YAML config loading
│           ├── types.ts             # TypeScript interfaces
│           └── index.ts             # Exports
│
├── packages/
│   └── cli/
│       └── src/
│           ├── commands/
│           │   └── briefing.ts      # Main command
│           └── index.ts             # CLI entry point
│
├── config/
│   └── personas/
│       └── examples/
│           └── sales-starter.yaml   # Example persona
│
├── package.json
├── tsconfig.json
└── README.md
```

## Core Types

```typescript
// packages/core/src/types.ts

export interface MCPConnection {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface ContextSource {
  id: string;
  name: string;
  connection: MCPConnection;
  tool: string;
  args: Record<string, unknown>;
}

export interface PersonaConfig {
  id: string;
  name: string;
  description?: string;
  sources: ContextSource[];
  briefing: {
    prompt: string;
  };
}

export interface ContextResult {
  sourceId: string;
  sourceName: string;
  data: unknown;
  error?: string;
}

export interface Briefing {
  content: string;
  generatedAt: Date;
  sources: string[];
}
```

## Implementation

### 1. MCP Client (packages/core/src/mcp/client.ts)

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { MCPConnection } from "../types.js";

export async function createClient(connection: MCPConnection): Promise<Client> {
  const transport = new StdioClientTransport({
    command: connection.command,
    args: connection.args,
    env: { ...process.env, ...connection.env },
  });

  const client = new Client(
    { name: "operator-os", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  await client.connect(transport);
  return client;
}

export async function callTool(
  client: Client,
  tool: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const result = await client.callTool({ name: tool, arguments: args });
  return result.content;
}

export async function closeClient(client: Client): Promise<void> {
  await client.close();
}
```

### 2. Context Aggregator (packages/core/src/context/aggregator.ts)

```typescript
import { createClient, callTool, closeClient } from "../mcp/client.js";
import type { ContextSource, ContextResult } from "../types.js";

export async function gatherContext(
  sources: ContextSource[]
): Promise<ContextResult[]> {
  const results = await Promise.allSettled(
    sources.map(async (source) => {
      const client = await createClient(source.connection);
      try {
        const data = await callTool(client, source.tool, source.args);
        return {
          sourceId: source.id,
          sourceName: source.name,
          data,
        };
      } finally {
        await closeClient(client);
      }
    })
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      sourceId: sources[i].id,
      sourceName: sources[i].name,
      data: null,
      error: result.reason?.message || "Unknown error",
    };
  });
}
```

### 3. Briefing Builder (packages/core/src/briefing/builder.ts)

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { ContextResult, Briefing } from "../types.js";

const DEFAULT_PROMPT = `You are generating a daily briefing based on the provided context.

Create a concise, actionable briefing with:
1. Key items requiring attention today
2. Important context for upcoming meetings
3. Follow-ups needed

Be specific and use the actual data. No generic advice.`;

export async function generateBriefing(
  context: ContextResult[],
  customPrompt?: string
): Promise<Briefing> {
  const anthropic = new Anthropic();

  const contextSection = context
    .filter((c) => !c.error)
    .map((c) => `## ${c.sourceName}\n\`\`\`json\n${JSON.stringify(c.data, null, 2)}\n\`\`\``)
    .join("\n\n");

  const prompt = `${customPrompt || DEFAULT_PROMPT}

## CONTEXT

${contextSection}

Generate the briefing now:`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const content =
    response.content[0].type === "text" ? response.content[0].text : "";

  return {
    content,
    generatedAt: new Date(),
    sources: context.filter((c) => !c.error).map((c) => c.sourceId),
  };
}
```

### 4. Persona Loader (packages/core/src/persona/loader.ts)

```typescript
import { readFile } from "fs/promises";
import { parse } from "yaml";
import { resolve } from "path";
import type { PersonaConfig } from "../types.js";

export async function loadPersona(nameOrPath: string): Promise<PersonaConfig> {
  // Check if it's a path or a persona name
  let filePath: string;
  
  if (nameOrPath.endsWith(".yaml") || nameOrPath.endsWith(".yml")) {
    filePath = resolve(nameOrPath);
  } else {
    // Look in default locations
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
  
  // Substitute environment variables in connection.env
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
```

### 5. CLI Command (packages/cli/src/commands/briefing.ts)

```typescript
import { loadPersona } from "@operator/core/persona/loader.js";
import { gatherContext } from "@operator/core/context/aggregator.js";
import { generateBriefing } from "@operator/core/briefing/builder.js";

export async function briefingCommand(persona: string, options: { verbose?: boolean }) {
  if (options.verbose) {
    console.log(`Loading persona: ${persona}`);
  }

  const config = await loadPersona(persona);
  
  if (options.verbose) {
    console.log(`Fetching context from ${config.sources.length} sources...`);
  }

  const context = await gatherContext(config.sources);

  const errors = context.filter((c) => c.error);
  if (errors.length > 0 && options.verbose) {
    console.warn(`Warning: ${errors.length} sources failed:`);
    errors.forEach((e) => console.warn(`  - ${e.sourceName}: ${e.error}`));
  }

  if (options.verbose) {
    console.log("Generating briefing...\n");
  }

  const briefing = await generateBriefing(context, config.briefing?.prompt);

  console.log(briefing.content);
}
```

### 6. CLI Entry (packages/cli/src/index.ts)

```typescript
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
```

## Example Persona (config/personas/examples/sales-starter.yaml)

```yaml
id: sales-starter
name: Sales Starter
description: Daily briefing for sales reps

sources:
  - id: calendar
    name: Today's Calendar
    connection:
      command: npx
      args: ["-y", "@modelcontextprotocol/server-google-calendar"]
    tool: list_events
    args:
      timeMin: "today"
      timeMax: "tomorrow"

  - id: gmail
    name: Recent Emails
    connection:
      command: npx
      args: ["-y", "@modelcontextprotocol/server-gmail"]
    tool: search_emails
    args:
      query: "is:unread"
      maxResults: 10

briefing:
  prompt: |
    Create a sales-focused daily briefing with:
    
    1. TODAY'S MEETINGS - List each meeting with relevant context
    2. EMAILS NEEDING RESPONSE - Prioritize by urgency
    3. FOLLOW-UPS - Based on meeting/email context
    
    Be specific. Use names and details from the data.
```

## Dependencies

```json
{
  "name": "operator-os",
  "type": "module",
  "workspaces": ["packages/*"],
  "devDependencies": {
    "typescript": "^5.3.0",
    "tsx": "^4.7.0",
    "@types/node": "^20.0.0"
  }
}
```

```json
{
  "name": "@operator/core",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./*": "./src/*.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@anthropic-ai/sdk": "^0.30.0",
    "yaml": "^2.3.0"
  }
}
```

```json
{
  "name": "@operator/cli",
  "type": "module",
  "bin": {
    "operator": "./src/index.ts"
  },
  "dependencies": {
    "@operator/core": "workspace:*",
    "commander": "^12.0.0"
  }
}
```

## Test It

```bash
# Set up API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run directly during development
pnpm tsx packages/cli/src/index.ts briefing sales-starter --verbose
```

## Success Criteria

- [ ] `operator briefing sales-starter` runs without crashing
- [ ] Connects to at least one MCP server
- [ ] Returns real data from that server
- [ ] Generates a briefing that references the actual data
- [ ] Takes < 30 seconds total