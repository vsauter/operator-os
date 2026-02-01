import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { parse } from "yaml";
import { join } from "path";
import { gatherContext, generateBriefing } from "@operator/core";

interface RawConfig {
  id: string;
  name: string;
  sources: {
    id: string;
    name: string;
    connection: {
      command: string;
      args: string[];
      env?: Record<string, string>;
    };
    tool: string;
    args: Record<string, unknown>;
  }[];
  tasks?: Record<string, { name: string; prompt: string; default?: boolean }>;
  briefing?: { prompt: string };
}

export async function POST(request: NextRequest) {
  try {
    const { operatorId, taskId } = await request.json();

    if (!operatorId) {
      return NextResponse.json({ error: "operatorId is required" }, { status: 400 });
    }

    const operatorPath = join(
      process.cwd(),
      "..",
      "..",
      "config",
      "operators",
      "examples",
      `${operatorId}.yaml`
    );

    const content = await readFile(operatorPath, "utf-8");
    const config = parse(content) as RawConfig;

    // Substitute environment variables
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

    const contextResults = await gatherContext(config.sources);

    const briefingResult = await generateBriefing(contextResults, prompt);

    return NextResponse.json({
      briefing: briefingResult.content,
      sourceResults: contextResults.map((r) => ({
        sourceId: r.sourceId,
        sourceName: r.sourceName,
        error: r.error,
      })),
    });
  } catch (error) {
    console.error("Failed to generate briefing:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate briefing" },
      { status: 500 }
    );
  }
}
