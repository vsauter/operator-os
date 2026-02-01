import Anthropic from "@anthropic-ai/sdk";
import type { ContextResult, Briefing } from "../types";
import { getGoalsContext } from "../goals/loader.js";

const DEFAULT_PROMPT = `You are generating a daily briefing based on the provided context.

Create a concise, actionable briefing with:
1. Key items requiring attention today
2. Important context for upcoming meetings
3. Follow-ups needed

Be specific and use the actual data. No generic advice.`;

export interface BriefingOptions {
  /** Custom prompt to use instead of default */
  customPrompt?: string;
  /** Pre-loaded goals context (if not provided, will load from config/goals.yaml) */
  goalsContext?: string | null;
  /** Skip loading goals entirely */
  skipGoals?: boolean;
}

export async function generateBriefing(
  context: ContextResult[],
  promptOrOptions?: string | BriefingOptions
): Promise<Briefing> {
  const anthropic = new Anthropic();

  // Handle both old string signature and new options object
  let customPrompt: string | undefined;
  let goalsContext: string | null | undefined;
  let skipGoals = false;

  if (typeof promptOrOptions === "string") {
    customPrompt = promptOrOptions;
  } else if (promptOrOptions) {
    customPrompt = promptOrOptions.customPrompt;
    goalsContext = promptOrOptions.goalsContext;
    skipGoals = promptOrOptions.skipGoals ?? false;
  }

  // Load goals if not provided and not skipped
  if (goalsContext === undefined && !skipGoals) {
    goalsContext = await getGoalsContext();
  }

  const contextSection = context
    .filter((c) => !c.error)
    .map((c) => `## ${c.sourceName}\n\`\`\`json\n${JSON.stringify(c.data, null, 2)}\n\`\`\``)
    .join("\n\n");

  // Build the full prompt with goals context
  const goalsSection = goalsContext
    ? `# ORGANIZATION GOALS\n\n${goalsContext}\n\n---\n\n`
    : "";

  const prompt = `${goalsSection}# TASK

${customPrompt || DEFAULT_PROMPT}

# DATA CONTEXT

${contextSection}

---

Generate the briefing now, keeping the organization goals in mind:`;

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
