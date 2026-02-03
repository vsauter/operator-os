import Anthropic from "@anthropic-ai/sdk";
import type { ContextResult } from "../types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatSession {
  context: ContextResult[];
  briefing: string;
  taskPrompt: string;
  messages: ChatMessage[];
}

export function createChatSession(
  context: ContextResult[],
  briefing: string,
  taskPrompt: string
): ChatSession {
  return {
    context,
    briefing,
    taskPrompt,
    messages: [],
  };
}

function buildSystemPrompt(session: ChatSession): string {
  const contextSection = session.context
    .filter((c) => !c.error)
    .map((c) => `## ${c.sourceName}\n\`\`\`json\n${JSON.stringify(c.data, null, 2)}\n\`\`\``)
    .join("\n\n");

  return `You are an AI assistant helping analyze data from an operator task.

# ORIGINAL TASK
${session.taskPrompt}

# DATA CONTEXT
${contextSection}

# GENERATED BRIEFING
${session.briefing}

---

The user may ask follow-up questions about the briefing or the underlying data.
Answer based on the data context provided above. Be specific and reference actual data points.
If the user asks about something not in the data, say so clearly.`;
}

export async function chat(
  session: ChatSession,
  userMessage: string
): Promise<string> {
  const anthropic = new Anthropic();

  // Add user message to history
  session.messages.push({ role: "user", content: userMessage });

  // Build messages array for API
  const messages = session.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: buildSystemPrompt(session),
    messages,
  });

  const content =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Add assistant response to history
  session.messages.push({ role: "assistant", content });

  return content;
}
