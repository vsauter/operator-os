import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { parse } from "yaml";
import { join } from "path";
import { gatherContext, generateBriefing } from "@operator/core";
import type { OperatorConfig } from "@operator/core";

export async function POST(request: NextRequest) {
  try {
    const { operatorId } = await request.json();

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
    const config = parse(content) as OperatorConfig;

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

    const contextResults = await gatherContext(config.sources);

    const briefingResult = await generateBriefing(contextResults, config.briefing?.prompt);

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
