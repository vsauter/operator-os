import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createChatSession, chat } from "@operator/core";
import { checkRateLimit, getClientId, RATE_LIMITS } from "@/lib/rate-limit";
import { validateRequest } from "@/lib/validation";

const chatRequestSchema = z.object({
  message: z.string().min(1, "Message is required").max(5000, "Message too long"),
  context: z.object({
    briefing: z.string(),
    taskPrompt: z.string(),
    sources: z.array(
      z.object({
        sourceName: z.string(),
        data: z.unknown(),
      })
    ),
  }),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientId = getClientId(request);
  const rateLimit = checkRateLimit(`chat:${clientId}`, RATE_LIMITS.chat);

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please wait before sending more messages.",
        retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    const validation = validateRequest(chatRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { message, context, history = [] } = validation.data;

    // Convert context to ContextResult format for createChatSession
    const contextResults = context.sources.map((s, i) => ({
      sourceId: `source-${i}`,
      sourceName: s.sourceName,
      data: s.data,
    }));

    // Create chat session with history
    const session = createChatSession(
      contextResults,
      context.briefing,
      context.taskPrompt
    );

    // Add history to session
    session.messages = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Send message and get response
    const response = await chat(session, message);

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    );
  }
}
