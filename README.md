# OperatorOS

A unified platform for orchestrating AI-powered workflows across multiple data sources. Define operators that pull context from CRMs, project tools, and support systems, then use Claude to generate briefings, draft emails, identify risks, and more.

## Features

- **Multi-source context aggregation** - Pull data from HubSpot, Gong, Linear, Pylon, and custom MCP servers in parallel
- **Flexible operator configs** - Define workflows in YAML with multiple tasks per operator
- **Dual interface** - CLI for automation, Web UI for interactive use
- **Extensible connectors** - Support for both MCP (Model Context Protocol) and REST API integrations
- **AI-powered synthesis** - Uses Claude to analyze context and generate actionable outputs

## Quick Start

```bash
# Install dependencies
pnpm install

# Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...

# Set connector credentials (example for HubSpot + Gong)
export HUBSPOT_ACCESS_TOKEN=pat-na1-...
export GONG_ACCESS_KEY=...
export GONG_ACCESS_SECRET=...

# Run an operator from CLI
pnpm cli operator run deal-intelligence

# Or start the web UI
pnpm dev
```

## Project Structure

```
operator-os/
├── packages/
│   ├── core/          # Core library - context aggregation, connectors, AI
│   ├── cli/           # Command-line interface
│   ├── ui/            # Next.js web interface
│   └── connectors/    # MCP connector implementations
├── connectors/        # Connector YAML definitions
└── config/
    └── operators/     # Operator YAML configs
```

## Operators

Operators are YAML configurations that define:
- **Sources** - Where to fetch context data from
- **Tasks** - What to do with the data (briefings, emails, alerts, etc.)

### Example Operator

```yaml
id: deal-intelligence
name: Deal Intelligence
description: Analyze deals using HubSpot + Gong data

sources:
  - connector: hubspot
    fetch: open_deals_with_owners

  - connector: hubspot
    fetch: pipeline_summary

  - connector: gong
    fetch: recent_calls
    params:
      days_back: 7

tasks:
  important-deals:
    name: Important Deals Analysis
    prompt: |
      Analyze the HubSpot deals and Gong call activity to identify
      the most important deals from the last week.

      For each deal, provide:
      1. Deal name and amount
      2. Owner and close date
      3. Recent call activity
      4. Risk level and recommended action
    default: true

  deal-gaps:
    name: Deal Coverage Gaps
    prompt: |
      Find deals without recent Gong calls that need attention.
```

### Running Operators

**CLI:**
```bash
# Run default task
pnpm cli operator run deal-intelligence

# Run specific task
pnpm cli operator run deal-intelligence deal-gaps

# List available tasks
pnpm cli operator run deal-intelligence --list

# Verbose output
pnpm cli operator run deal-intelligence --verbose
```

**Web UI:**
```bash
pnpm dev
# Open http://localhost:3000
```

## Connectors

Connectors define how to connect to external services. Two types are supported:

### MCP Connectors

Use Model Context Protocol servers for rich tool-based integrations:

```yaml
id: hubspot
name: HubSpot
type: mcp

mcp:
  command: npx
  args: ["tsx", "packages/connectors/src/hubspot/index.ts"]
  env:
    HUBSPOT_ACCESS_TOKEN: "{{credentials.accessToken}}"

fetches:
  open_deals:
    tool: get_open_deals
    description: "Get all open deals sorted by amount"

  pipeline_summary:
    tool: get_pipeline_summary
    description: "Get pipeline summary with deal counts per stage"

auth:
  type: token
  fields:
    accessToken:
      label: "Private App Access Token"
      type: password
```

### API Connectors

Direct REST API integration for simpler use cases:

```yaml
id: pylon
name: Pylon
type: api

api:
  baseUrl: https://api.usepylon.com
  auth:
    type: token
    token: "{{credentials.apiKey}}"

fetches:
  issues:
    endpoint: GET /issues
    description: "Get support issues"
    params:
      state:
        type: string
        default: "open"
```

### Available Connectors

| Connector | Type | Description |
|-----------|------|-------------|
| **HubSpot** | MCP | CRM - deals, contacts, companies, pipelines, owners |
| **Gong** | MCP | Sales intelligence - calls, team activity |
| **Linear** | MCP | Project management - issues, projects, teams |
| **Pylon** | API | Customer support - issues, accounts |
| **Filesystem** | MCP | Local file access |

## Environment Variables

### Required

```bash
ANTHROPIC_API_KEY=sk-ant-...    # For Claude AI
```

### Connector Credentials

Set based on which connectors you use:

```bash
# HubSpot
HUBSPOT_ACCESS_TOKEN=pat-na1-...

# Gong
GONG_ACCESS_KEY=...
GONG_ACCESS_SECRET=...
GONG_API_URL=https://api.gong.io/v2   # or your regional URL

# Linear
LINEAR_API_KEY=lin_api_...

# Pylon
PYLON_API_KEY=...
```

## Development

```bash
# Install dependencies
pnpm install

# Run CLI in development
pnpm cli operator run <operator>

# Run web UI in development
pnpm dev

# Build all packages
pnpm build

# Type checking
pnpm typecheck
```

### Adding a New Connector

1. Create connector definition in `connectors/<name>.yaml`
2. For MCP connectors, implement the server in `packages/connectors/src/<name>/`
3. Export from `packages/connectors/src/index.ts`
4. Use in operator configs via `connector: <name>`

### Creating an Operator

1. Create YAML file in `config/operators/` or `config/operators/examples/`
2. Define sources (which connectors and fetches to use)
3. Define tasks (prompts for different use cases)
4. Run with CLI or Web UI

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Interfaces                           │
│  ┌─────────────┐              ┌─────────────────────┐  │
│  │   CLI       │              │   Web UI (Next.js)  │  │
│  └──────┬──────┘              └──────────┬──────────┘  │
└─────────┼────────────────────────────────┼──────────────┘
          │                                │
          ▼                                ▼
┌─────────────────────────────────────────────────────────┐
│                   Core Library                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Operator   │  │  Connector   │  │   Briefing    │  │
│  │   Loader    │─▶│   Registry   │─▶│   Builder     │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│                          │                              │
│                          ▼                              │
│         ┌────────────────────────────────┐             │
│         │     Context Aggregator         │             │
│         │  (parallel source execution)   │             │
│         └───────────────┬────────────────┘             │
│                         │                               │
│         ┌───────────────┼───────────────┐              │
│         ▼               ▼               ▼              │
│    ┌─────────┐    ┌─────────┐    ┌─────────┐          │
│    │   MCP   │    │   API   │    │ Legacy  │          │
│    │ Adapter │    │ Adapter │    │ Adapter │          │
│    └────┬────┘    └────┬────┘    └────┬────┘          │
└─────────┼──────────────┼──────────────┼─────────────────┘
          │              │              │
          ▼              ▼              ▼
   ┌────────────────────────────────────────────┐
   │           External Services                │
   │  HubSpot  Gong  Linear  Pylon  Files  ... │
   └────────────────────────────────────────────┘
```

## License

MIT
