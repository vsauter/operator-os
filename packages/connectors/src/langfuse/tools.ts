import { z } from "zod";
import type { LangfuseClient } from "./client.js";

export const toolDefinitions = {
  // ==================== Traces ====================
  get_recent_traces: {
    description:
      "Get recent LLM traces from Langfuse. Returns trace details including name, latency, cost, and token usage.",
    schema: {
      days_back: z
        .number()
        .default(7)
        .describe("Number of days to look back (default: 7)"),
      limit: z
        .number()
        .default(50)
        .describe("Maximum number of traces to return (default: 50)"),
    },
  },

  get_trace_details: {
    description:
      "Get detailed information about a specific trace including all observations and scores.",
    schema: {
      trace_id: z.string().describe("The Langfuse trace ID"),
    },
  },

  search_traces: {
    description:
      "Search for traces by name or user ID. Useful for finding specific LLM interactions.",
    schema: {
      query: z
        .string()
        .describe("Search query (trace name or user ID)"),
      days_back: z
        .number()
        .default(30)
        .describe("Number of days to search (default: 30)"),
      limit: z
        .number()
        .default(50)
        .describe("Maximum number of results (default: 50)"),
    },
  },

  get_traces_by_session: {
    description:
      "Get all traces belonging to a specific user session.",
    schema: {
      session_id: z.string().describe("The session ID to filter by"),
      limit: z
        .number()
        .default(50)
        .describe("Maximum number of traces to return"),
    },
  },

  // ==================== Observations ====================
  get_observations: {
    description:
      "Get LLM observations (generations, spans, events) from Langfuse. Generations are individual LLM calls.",
    schema: {
      type: z
        .enum(["GENERATION", "SPAN", "EVENT"])
        .optional()
        .describe("Filter by observation type"),
      days_back: z
        .number()
        .default(7)
        .describe("Number of days to look back"),
      limit: z
        .number()
        .default(50)
        .describe("Maximum number of observations to return"),
    },
  },

  get_trace_observations: {
    description:
      "Get all observations (generations, spans, events) for a specific trace. Useful for understanding the full execution flow.",
    schema: {
      trace_id: z.string().describe("The trace ID to get observations for"),
    },
  },

  get_observation_details: {
    description:
      "Get detailed information about a specific observation including input/output, model, and usage.",
    schema: {
      observation_id: z.string().describe("The observation ID"),
    },
  },

  // ==================== Scores ====================
  get_scores: {
    description:
      "Get evaluation scores from Langfuse. Scores can be from automated evals, human annotations, or API submissions.",
    schema: {
      name: z
        .string()
        .optional()
        .describe("Filter by score name (e.g., 'quality', 'relevance')"),
      source: z
        .enum(["API", "EVAL", "ANNOTATION"])
        .optional()
        .describe("Filter by score source"),
      days_back: z
        .number()
        .default(7)
        .describe("Number of days to look back"),
      limit: z
        .number()
        .default(50)
        .describe("Maximum number of scores to return"),
    },
  },

  get_trace_scores: {
    description:
      "Get all evaluation scores for a specific trace.",
    schema: {
      trace_id: z.string().describe("The trace ID to get scores for"),
    },
  },

  // ==================== Sessions ====================
  get_sessions: {
    description:
      "Get user sessions from Langfuse. Sessions group related traces together.",
    schema: {
      limit: z
        .number()
        .default(50)
        .describe("Maximum number of sessions to return"),
    },
  },

  get_session_details: {
    description:
      "Get detailed information about a session including all its traces.",
    schema: {
      session_id: z.string().describe("The session ID"),
    },
  },

  // ==================== Prompts ====================
  get_prompts: {
    description:
      "Get prompt templates managed in Langfuse. Returns prompt names, versions, and types.",
    schema: {
      limit: z
        .number()
        .default(50)
        .describe("Maximum number of prompts to return"),
    },
  },

  get_prompt: {
    description:
      "Get a specific prompt template by name, optionally with a specific version or label.",
    schema: {
      name: z.string().describe("The prompt name"),
      version: z
        .number()
        .optional()
        .describe("Specific version number (optional)"),
      label: z
        .string()
        .optional()
        .describe("Label to fetch (e.g., 'production')"),
    },
  },

  // ==================== Analytics ====================
  get_usage_summary: {
    description:
      "Get a summary of LLM usage including total traces, cost, tokens, and latency metrics.",
    schema: {
      days_back: z
        .number()
        .default(7)
        .describe("Number of days to analyze"),
    },
  },

  get_model_usage: {
    description:
      "Get usage breakdown by model. Shows which models are being used and their costs.",
    schema: {
      days_back: z
        .number()
        .default(7)
        .describe("Number of days to analyze"),
    },
  },

  // ==================== Users ====================
  get_users: {
    description:
      "Get a list of users who have made LLM requests. Shows trace count, cost, and token usage per user.",
    schema: {
      days_back: z
        .number()
        .default(7)
        .describe("Number of days to look back"),
      limit: z
        .number()
        .default(100)
        .describe("Maximum number of traces to analyze"),
    },
  },

  get_user_traces: {
    description:
      "Get all traces for a specific user. Useful for analyzing a user's LLM usage patterns.",
    schema: {
      user_id: z.string().describe("The user ID to get traces for"),
      days_back: z
        .number()
        .default(30)
        .describe("Number of days to look back"),
      limit: z
        .number()
        .default(50)
        .describe("Maximum number of traces to return"),
    },
  },

  get_user_stats: {
    description:
      "Get detailed statistics for a specific user including total cost, tokens, models used, and error rate.",
    schema: {
      user_id: z.string().describe("The user ID to get stats for"),
      days_back: z
        .number()
        .default(30)
        .describe("Number of days to analyze"),
    },
  },
};

export function createToolHandlers(client: LangfuseClient) {
  return {
    // ==================== Traces ====================
    get_recent_traces: async (args: { days_back?: number; limit?: number }) => {
      const traces = await client.getRecentTraces(
        args.limit || 50,
        args.days_back || 7
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: traces.length,
                period_days: args.days_back || 7,
                traces: traces.map((t) => client.formatTrace(t)),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_trace_details: async (args: { trace_id: string }) => {
      const trace = await client.getTrace(args.trace_id);
      const observations = await client.getTraceObservations(args.trace_id);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                trace: {
                  ...client.formatTrace(trace),
                  input: trace.input,
                  output: trace.output,
                  metadata: trace.metadata,
                  tags: trace.tags,
                },
                observations: observations.map((o) => client.formatObservation(o)),
                scores: trace.scores?.map((s) => client.formatScore(s)) || [],
              },
              null,
              2
            ),
          },
        ],
      };
    },

    search_traces: async (args: {
      query: string;
      days_back?: number;
      limit?: number;
    }) => {
      const traces = await client.searchTraces(
        args.query,
        args.days_back || 30,
        args.limit || 50
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                query: args.query,
                count: traces.length,
                traces: traces.map((t) => client.formatTrace(t)),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_traces_by_session: async (args: { session_id: string; limit?: number }) => {
      const traces = await client.getTraces({
        sessionId: args.session_id,
        limit: args.limit || 50,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                session_id: args.session_id,
                count: traces.length,
                traces: traces.map((t) => client.formatTrace(t)),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    // ==================== Observations ====================
    get_observations: async (args: {
      type?: "GENERATION" | "SPAN" | "EVENT";
      days_back?: number;
      limit?: number;
    }) => {
      const fromStartTime = new Date(
        Date.now() - (args.days_back || 7) * 24 * 60 * 60 * 1000
      ).toISOString();

      const observations = await client.getObservations({
        type: args.type,
        fromStartTime,
        limit: args.limit || 50,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: observations.length,
                filter: args.type ? { type: args.type } : null,
                period_days: args.days_back || 7,
                observations: observations.map((o) => client.formatObservation(o)),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_trace_observations: async (args: { trace_id: string }) => {
      const observations = await client.getTraceObservations(args.trace_id);

      // Group by type for better readability
      const generations = observations.filter((o) => o.type === "GENERATION");
      const spans = observations.filter((o) => o.type === "SPAN");
      const events = observations.filter((o) => o.type === "EVENT");

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                trace_id: args.trace_id,
                total: observations.length,
                by_type: {
                  generations: generations.length,
                  spans: spans.length,
                  events: events.length,
                },
                observations: observations.map((o) => ({
                  ...client.formatObservation(o),
                  input: o.input,
                  output: o.output,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_observation_details: async (args: { observation_id: string }) => {
      const obs = await client.getObservation(args.observation_id);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                observation: {
                  ...client.formatObservation(obs),
                  input: obs.input,
                  output: obs.output,
                  metadata: obs.metadata,
                  model_parameters: obs.modelParameters,
                  prompt: obs.promptName
                    ? { name: obs.promptName, version: obs.promptVersion }
                    : null,
                  usage: obs.usage,
                  costs: {
                    input: obs.calculatedInputCost,
                    output: obs.calculatedOutputCost,
                    total: obs.calculatedTotalCost,
                  },
                  time_to_first_token_ms: obs.timeToFirstToken
                    ? Math.round(obs.timeToFirstToken * 1000)
                    : null,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    },

    // ==================== Scores ====================
    get_scores: async (args: {
      name?: string;
      source?: "API" | "EVAL" | "ANNOTATION";
      days_back?: number;
      limit?: number;
    }) => {
      const fromTimestamp = new Date(
        Date.now() - (args.days_back || 7) * 24 * 60 * 60 * 1000
      ).toISOString();

      const scores = await client.getScores({
        name: args.name,
        source: args.source,
        fromTimestamp,
        limit: args.limit || 50,
      });

      // Calculate score statistics for numeric scores
      const numericScores = scores.filter((s) => s.dataType === "NUMERIC" && s.value !== undefined);
      const avgScore =
        numericScores.length > 0
          ? numericScores.reduce((sum, s) => sum + (s.value || 0), 0) /
            numericScores.length
          : null;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: scores.length,
                filter: {
                  name: args.name || null,
                  source: args.source || null,
                },
                period_days: args.days_back || 7,
                statistics: {
                  numeric_scores: numericScores.length,
                  average_value: avgScore
                    ? Math.round(avgScore * 100) / 100
                    : null,
                },
                scores: scores.map((s) => client.formatScore(s)),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_trace_scores: async (args: { trace_id: string }) => {
      const scores = await client.getTraceScores(args.trace_id);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                trace_id: args.trace_id,
                count: scores.length,
                scores: scores.map((s) => ({
                  ...client.formatScore(s),
                  comment: s.comment,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    // ==================== Sessions ====================
    get_sessions: async (args: { limit?: number }) => {
      const sessions = await client.getSessions(1, args.limit || 50);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: sessions.length,
                sessions: sessions.map((s) => ({
                  id: s.id,
                  created_at: s.createdAt,
                  total_cost: s.totalCost,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_session_details: async (args: { session_id: string }) => {
      const session = await client.getSession(args.session_id);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                session: {
                  id: session.id,
                  created_at: session.createdAt,
                  total_cost: session.totalCost,
                  trace_count: session.traces?.length || 0,
                },
                traces: session.traces?.map((t) => client.formatTrace(t)) || [],
              },
              null,
              2
            ),
          },
        ],
      };
    },

    // ==================== Prompts ====================
    get_prompts: async (args: { limit?: number }) => {
      const prompts = await client.getPrompts(1, args.limit || 50);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: prompts.length,
                prompts: prompts.map((p) => ({
                  name: p.name,
                  version: p.version,
                  type: p.type,
                  labels: p.labels,
                  tags: p.tags,
                  updated_at: p.updatedAt,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_prompt: async (args: {
      name: string;
      version?: number;
      label?: string;
    }) => {
      const prompt = await client.getPrompt(args.name, args.version, args.label);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                prompt: {
                  name: prompt.name,
                  version: prompt.version,
                  type: prompt.type,
                  content: prompt.prompt,
                  config: prompt.config,
                  labels: prompt.labels,
                  tags: prompt.tags,
                  created_at: prompt.createdAt,
                  updated_at: prompt.updatedAt,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    },

    // ==================== Analytics ====================
    get_usage_summary: async (args: { days_back?: number }) => {
      const summary = await client.getTraceSummary(args.days_back || 7);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                period_days: args.days_back || 7,
                summary: {
                  total_traces: summary.total_traces,
                  total_cost_usd: summary.total_cost,
                  total_tokens: summary.total_tokens,
                  avg_latency_ms: summary.avg_latency_ms,
                  error_count: summary.error_count,
                  error_rate_percent:
                    summary.total_traces > 0
                      ? Math.round(
                          (summary.error_count / summary.total_traces) * 100 * 10
                        ) / 10
                      : 0,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_model_usage: async (args: { days_back?: number }) => {
      const usage = await client.getModelUsage(args.days_back || 7);

      const totalCost = usage.reduce((sum, u) => sum + u.total_cost, 0);
      const totalTokens = usage.reduce((sum, u) => sum + u.total_tokens, 0);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                period_days: args.days_back || 7,
                total_cost_usd: Math.round(totalCost * 10000) / 10000,
                total_tokens: totalTokens,
                models: usage.map((u) => ({
                  model: u.model,
                  generation_count: u.count,
                  total_tokens: u.total_tokens,
                  total_cost_usd: u.total_cost,
                  percentage_of_cost:
                    totalCost > 0
                      ? Math.round((u.total_cost / totalCost) * 100 * 10) / 10
                      : 0,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    // ==================== Users ====================
    get_users: async (args: { days_back?: number; limit?: number }) => {
      const users = await client.getUsers(args.days_back || 7, args.limit || 100);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                period_days: args.days_back || 7,
                total_users: users.length,
                users: users.map((u) => ({
                  user_id: u.userId,
                  trace_count: u.traceCount,
                  total_cost_usd: u.totalCost,
                  total_tokens: u.totalTokens,
                  last_seen: u.lastSeen,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_user_traces: async (args: {
      user_id: string;
      days_back?: number;
      limit?: number;
    }) => {
      const traces = await client.getUserTraces(
        args.user_id,
        args.limit || 50,
        args.days_back || 30
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                user_id: args.user_id,
                count: traces.length,
                period_days: args.days_back || 30,
                traces: traces.map((t) => client.formatTrace(t)),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_user_stats: async (args: { user_id: string; days_back?: number }) => {
      const stats = await client.getUserStats(args.user_id, args.days_back || 30);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                period_days: args.days_back || 30,
                user: {
                  user_id: stats.userId,
                  total_traces: stats.totalTraces,
                  total_cost_usd: stats.totalCost,
                  total_tokens: stats.totalTokens,
                  avg_latency_ms: stats.avgLatencyMs,
                  error_count: stats.errorCount,
                  error_rate_percent:
                    stats.totalTraces > 0
                      ? Math.round((stats.errorCount / stats.totalTraces) * 100 * 10) / 10
                      : 0,
                  models_used: stats.models,
                  first_seen: stats.firstSeen,
                  last_seen: stats.lastSeen,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    },
  };
}
