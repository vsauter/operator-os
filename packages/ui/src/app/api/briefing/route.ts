import { NextRequest, NextResponse } from "next/server";
import { readFile, access } from "fs/promises";
import { parse } from "yaml";
import { join } from "path";
import { gatherContext, generateBriefing } from "@operator/core";
import type { OperatorSource, LegacySource, ConnectorSource } from "@operator/core";
import { checkRateLimit, getClientId, RATE_LIMITS } from "@/lib/rate-limit";
import { briefingRequestSchema, validateRequest } from "@/lib/validation";

async function findOperatorPath(operatorId: string): Promise<string> {
  const baseDir = join(process.cwd(), "..", "..", "config", "operators");
  const locations = [
    join(baseDir, "local", `${operatorId}.yaml`),
    join(baseDir, "examples", `${operatorId}.yaml`),
  ];

  for (const path of locations) {
    try {
      await access(path);
      return path;
    } catch {
      continue;
    }
  }

  throw new Error(`Operator not found: ${operatorId}`);
}

interface RawConfig {
  id: string;
  name: string;
  sources: unknown[];
  tasks?: Record<string, { name: string; prompt: string; default?: boolean }>;
  briefing?: { prompt: string };
}

function processLegacySourceEnv(source: LegacySource): LegacySource {
  if (source.connection.env) {
    const processedEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(source.connection.env)) {
      if (typeof value === "string" && value.startsWith("$")) {
        const envVar = value.slice(1);
        processedEnv[key] = process.env[envVar] || "";
      } else {
        processedEnv[key] = value;
      }
    }
    source.connection.env = processedEnv;
  }
  return source;
}

function normalizeSource(rawSource: unknown): OperatorSource {
  if (!rawSource || typeof rawSource !== "object") {
    throw new Error(`Invalid source format: ${JSON.stringify(rawSource)}`);
  }

  const source = rawSource as Record<string, unknown>;

  if (typeof source.connector === "string" && typeof source.fetch === "string") {
    return source as unknown as ConnectorSource;
  }

  if (
    typeof source.id === "string" &&
    typeof source.name === "string" &&
    typeof source.tool === "string" &&
    source.connection &&
    typeof source.connection === "object"
  ) {
    return processLegacySourceEnv(source as unknown as LegacySource);
  }

  throw new Error(
    `Invalid source format. Expected either { connector, fetch } or { connection, tool }. Got: ${JSON.stringify(source)}`
  );
}

function countItems(data: unknown): number | undefined {
  if (data === null || data === undefined) {
    return undefined;
  }
  if (Array.isArray(data)) {
    return data.length;
  }
  if (typeof data === "object") {
    // Check for common patterns like { items: [...] } or { results: [...] }
    const obj = data as Record<string, unknown>;
    for (const key of ["items", "results", "data", "records", "entries"]) {
      if (Array.isArray(obj[key])) {
        return (obj[key] as unknown[]).length;
      }
    }
    // Count top-level keys if it's a plain object
    return Object.keys(obj).length;
  }
  return undefined;
}

function isEmptyData(data: unknown): boolean {
  if (data === null || data === undefined) {
    return true;
  }
  if (Array.isArray(data)) {
    return data.length === 0;
  }
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    // Check for common patterns
    for (const key of ["items", "results", "data", "records", "entries"]) {
      if (Array.isArray(obj[key])) {
        return (obj[key] as unknown[]).length === 0;
      }
    }
    return Object.keys(obj).length === 0;
  }
  return false;
}

export async function POST(request: NextRequest) {
  // Rate limiting - protect against excessive LLM API usage
  const clientId = getClientId(request);
  const rateLimit = checkRateLimit(`briefing:${clientId}`, RATE_LIMITS.briefing);

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please wait before generating more briefings.",
        retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateLimit.reset - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.reset),
        },
      }
    );
  }

  const startTime = Date.now();

  try {
    const body = await request.json();

    // Validate request body with Zod schema
    const validation = validateRequest(briefingRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { operatorId, taskId } = validation.data;

    const operatorPath = await findOperatorPath(operatorId);
    const content = await readFile(operatorPath, "utf-8");
    const config = parse(content) as RawConfig;
    const sources = config.sources.map(normalizeSource);

    // Get prompt from task or briefing
    let prompt: string | undefined;
    if (config.tasks) {
      if (taskId && config.tasks[taskId]) {
        prompt = config.tasks[taskId].prompt;
      } else {
        // Find default task or first task
        const defaultTask = Object.entries(config.tasks).find(([, t]) => t.default);
        if (defaultTask) {
          prompt = defaultTask[1].prompt;
        } else {
          const firstTask = Object.values(config.tasks)[0];
          prompt = firstTask?.prompt;
        }
      }
    } else if (config.briefing) {
      prompt = config.briefing.prompt;
    }

    // Track timing for each source
    const sourceTimings: Map<string, { startTime: number; endTime?: number }> = new Map();

    // Start timing for all sources
    for (const source of sources) {
      let sourceId: string;
      if ("connector" in source && "fetch" in source) {
        sourceId = source.id ?? `${source.connector}-${source.fetch}`;
      } else {
        sourceId = source.id;
      }
      sourceTimings.set(sourceId, { startTime: Date.now() });
    }

    const contextResults = await gatherContext(sources);

    // Calculate end times (approximate - all finish around the same time with Promise.allSettled)
    const contextEndTime = Date.now();

    // Build source results with enhanced metadata
    const sourceResults = contextResults.map((r) => {
      const timing = sourceTimings.get(r.sourceId);
      const durationMs = timing ? contextEndTime - timing.startTime : undefined;
      const itemCount = r.error ? undefined : countItems(r.data);
      const isEmpty = !r.error && isEmptyData(r.data);

      let status: "success" | "error" | "warning";
      if (r.error) {
        status = "error";
      } else if (isEmpty) {
        status = "warning";
      } else {
        status = "success";
      }

      return {
        id: r.sourceId,
        name: r.sourceName,
        status,
        itemCount,
        error: r.error,
        durationMs,
      };
    });

    // Try to generate the briefing - handle LLM errors separately
    let briefingContent: string;
    try {
      const briefingResult = await generateBriefing(contextResults, prompt);
      briefingContent = briefingResult.content;
    } catch (llmError) {
      const totalDurationMs = Date.now() - startTime;
      const errorMessage = llmError instanceof Error ? llmError.message : "Unknown error";

      // Check for common LLM provider errors
      let userFriendlyError: string;
      if (errorMessage.includes("apiKey") || errorMessage.includes("authToken") || errorMessage.includes("API key")) {
        userFriendlyError = "LLM Error: Missing API key. Please set ANTHROPIC_API_KEY environment variable.";
      } else if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
        userFriendlyError = "LLM Error: Rate limited. Please wait and try again.";
      } else if (errorMessage.includes("insufficient") || errorMessage.includes("quota")) {
        userFriendlyError = "LLM Error: API quota exceeded. Check your Anthropic account.";
      } else {
        userFriendlyError = `LLM Error: ${errorMessage}`;
      }

      console.error("Failed to generate briefing (LLM):", llmError);

      // Return sources successfully gathered, but with LLM error
      return NextResponse.json({
        sources: sourceResults,
        totalDurationMs,
        error: userFriendlyError,
        briefing: null,
      });
    }

    const totalDurationMs = Date.now() - startTime;

    // Build chat context from successful sources
    const chatContext = contextResults
      .filter((r) => !r.error)
      .map((r) => ({
        sourceName: r.sourceName,
        data: r.data,
      }));

    return NextResponse.json({
      briefing: briefingContent,
      sources: sourceResults,
      totalDurationMs,
      chatContext,
      taskPrompt: prompt,
    });
  } catch (error) {
    console.error("Failed to generate briefing:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate briefing" },
      { status: 500 }
    );
  }
}
