import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile, writeFile, access } from "fs/promises";
import { parse } from "yaml";
import { join } from "path";
import { validateOperator } from "@/lib/operatorSchema";
import { checkRateLimit, getClientId, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

// Maximum file size for operator YAML (100KB)
const MAX_FILE_SIZE = 100 * 1024;

// Schema for operator creation request
const createOperatorSchema = z.object({
  yaml: z
    .string()
    .min(1, "YAML content is required")
    .max(MAX_FILE_SIZE, `YAML content too large (max ${MAX_FILE_SIZE / 1024}KB)`),
});

interface SourceConfig {
  // Connector-based format
  connector?: string;
  fetch?: string;
  // Legacy format
  id?: string;
  name?: string;
}

interface RawConfig {
  id: string;
  name: string;
  description?: string;
  sources: SourceConfig[];
  tasks?: Record<string, { name: string; prompt: string; default?: boolean }>;
  briefing?: { prompt: string };
}

function getSourceConnector(source: SourceConfig): string {
  // Connector-based format
  if (source.connector) {
    return capitalize(source.connector);
  }
  // Legacy format - extract from id or name
  return source.name || source.id || "Unknown";
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getUniqueConnectors(sources: SourceConfig[]): string[] {
  const connectors = sources.map(getSourceConnector);
  return [...new Set(connectors)];
}

async function loadOperatorsFromDir(dir: string) {
  try {
    const files = await readdir(dir);
    const yamlFiles = files.filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

    return Promise.all(
      yamlFiles.map(async (file) => {
        const content = await readFile(join(dir, file), "utf-8");
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
          connectors: getUniqueConnectors(config.sources),
          tasks,
        };
      })
    );
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const baseDir = join(process.cwd(), "..", "..", "config", "operators");

    // Load from both local (personal) and examples directories
    const [localOperators, exampleOperators] = await Promise.all([
      loadOperatorsFromDir(join(baseDir, "local")),
      loadOperatorsFromDir(join(baseDir, "examples")),
    ]);

    // Local operators take precedence (appear first, can override examples by id)
    const seenIds = new Set<string>();
    const operators = [];

    for (const op of [...localOperators, ...exampleOperators]) {
      if (!seenIds.has(op.id)) {
        seenIds.add(op.id);
        operators.push(op);
      }
    }

    return NextResponse.json({ operators });
  } catch (error) {
    console.error("Failed to load operators:", error);
    return NextResponse.json({ error: "Failed to load operators" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientId = getClientId(request);
  const rateLimit = checkRateLimit(`operators:${clientId}`, RATE_LIMITS.operators);

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please wait before creating more operators.",
        retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateLimit.reset - Date.now()) / 1000)),
        },
      }
    );
  }

  try {
    const body = await request.json();

    // Validate request body with Zod schema
    const validation = createOperatorSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message);
      return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
    }

    const { yaml: yamlContent } = validation.data;

    // Check actual byte size (handles multi-byte characters)
    const byteSize = new TextEncoder().encode(yamlContent).length;
    if (byteSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Content too large. Maximum size is ${MAX_FILE_SIZE / 1024}KB.` },
        { status: 400 }
      );
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
