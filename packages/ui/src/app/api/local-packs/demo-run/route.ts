import { NextRequest, NextResponse } from "next/server";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import {
  buildPromptFromGoalWorkflow,
  fixtureToContextResults,
  generateBriefing,
  validatePackBundle,
  type PackBundle,
} from "@operator/core";
import { checkRateLimit, getClientId, RATE_LIMITS } from "@/lib/rate-limit";

const demoSchema = z.object({
  bundle: z.object({
    manifest: z.unknown(),
    operatorYaml: z.string().min(1),
    readme: z.string().optional(),
    fixtureContext: z.unknown().optional(),
  }),
  taskId: z.string().optional(),
});

interface RawConfig {
  audience?: "enterprise" | "consumer";
  tasks?: Record<string, { name: string; prompt: string; default?: boolean }>;
  briefing?: { prompt: string };
  goal?: {
    outcome: string;
    intent?: string;
    success?: string[];
  };
  constraints?: Record<string, unknown>;
  workflow?: Array<{
    id: string;
    type: "fetch" | "reason" | "decide" | "act" | "verify";
    uses?: string[];
    prompt?: string;
    approval?: "auto" | "ask" | "never";
    riskTier?: "low" | "medium" | "high";
  }>;
  policy?: {
    approvalMode?: "auto" | "ask" | "never";
    riskTier?: "low" | "medium" | "high";
    askBeforeSideEffects?: boolean;
    maxCostUsd?: number;
  };
  artifacts?: Array<{
    id: string;
    format: "json" | "markdown" | "text";
    schema?: string;
    description?: string;
    required?: boolean;
  }>;
}

function resolvePrompt(config: RawConfig, requestedTaskId?: string): string | undefined {
  if (config.tasks && Object.keys(config.tasks).length > 0) {
    if (requestedTaskId && config.tasks[requestedTaskId]) {
      return config.tasks[requestedTaskId].prompt;
    }
    const defaultTask = Object.values(config.tasks).find((task) => task.default);
    return defaultTask?.prompt || Object.values(config.tasks)[0]?.prompt;
  }

  if (config.briefing?.prompt) {
    return config.briefing.prompt;
  }

  return buildPromptFromGoalWorkflow({
    goal: config.goal,
    constraints: config.constraints,
    workflow: config.workflow,
    policy: config.policy,
    artifacts: config.artifacts,
  });
}

export async function POST(request: NextRequest) {
  const clientId = getClientId(request);
  const rateLimit = checkRateLimit(`local-packs:demo:${clientId}`, RATE_LIMITS.packs);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before running another local demo." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = demoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join("; ") },
        { status: 400 }
      );
    }

    const bundle: PackBundle = {
      manifest: parsed.data.bundle.manifest as PackBundle["manifest"],
      operatorYaml: parsed.data.bundle.operatorYaml,
      readme: parsed.data.bundle.readme,
      fixtureContext: parsed.data.bundle.fixtureContext,
    };

    const validation = validatePackBundle(bundle);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Invalid local pack bundle", details: validation.errors },
        { status: 400 }
      );
    }

    if (bundle.fixtureContext === undefined) {
      return NextResponse.json(
        { error: "Bundle does not include fixture context for demo runs." },
        { status: 400 }
      );
    }

    const contextResults = fixtureToContextResults(bundle.fixtureContext);
    if (contextResults.length === 0) {
      return NextResponse.json(
        { error: "Fixture context is empty. Include fixture data in bundle.fixtureContext." },
        { status: 400 }
      );
    }

    const config = parseYaml(bundle.operatorYaml) as RawConfig;
    const prompt = resolvePrompt(config, parsed.data.taskId);
    const result = await generateBriefing(contextResults, {
      customPrompt: prompt,
      skipGoals: config.audience === "consumer",
    });

    return NextResponse.json({
      success: true,
      pack: {
        id: bundle.manifest.id,
        version: bundle.manifest.version,
        name: bundle.manifest.name,
      },
      briefing: result.content,
      sources: contextResults.map((entry) => ({
        id: entry.sourceId,
        name: entry.sourceName,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run local pack demo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
