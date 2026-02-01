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
