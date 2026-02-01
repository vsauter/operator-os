import { z } from "zod";
import type { GongClient } from "./client.js";
import type { GongCall, GongDeal, GongDealActivity } from "./types.js";

export const toolDefinitions = {
  get_recent_calls: {
    description:
      "Get recent sales calls from Gong. Returns call details including participants, duration, and associated deals.",
    schema: {
      days_back: z
        .number()
        .default(7)
        .describe("Number of days to look back (default: 7)"),
    },
  },

  get_call_details: {
    description:
      "Get detailed information about a specific Gong call including participants and key metrics.",
    schema: {
      call_id: z.string().describe("The Gong call ID"),
    },
  },

  get_open_deals: {
    description:
      "Get all open deals from Gong with their current stage, amount, and close date.",
    schema: {},
  },

  get_important_deals: {
    description:
      "Get the most important deals to focus on, ranked by risk level and deal size. Includes engagement scores and activity metrics.",
    schema: {},
  },

  get_at_risk_deals: {
    description:
      "Get deals that are at risk due to low engagement or lack of recent activity. These need immediate attention.",
    schema: {},
  },

  get_deal_activity: {
    description:
      "Get detailed activity and engagement metrics for a specific deal, including call history and risk assessment.",
    schema: {
      deal_id: z.string().describe("The Gong deal ID"),
    },
  },

  search_calls: {
    description:
      "Search for calls by participant name or deal. Useful for finding specific conversations.",
    schema: {
      query: z.string().describe("Search query (participant name or keyword)"),
      days_back: z.number().default(30).describe("Number of days to search"),
    },
  },

  get_team_activity: {
    description:
      "Get an overview of team sales activity including call counts, deal coverage, and engagement trends.",
    schema: {
      days_back: z.number().default(7).describe("Number of days to analyze"),
    },
  },
};

// Helper to format call for response
function formatCall(call: GongCall) {
  const externalParties =
    call.parties?.filter((p) => p.affiliation === "External") || [];
  const internalParties =
    call.parties?.filter((p) => p.affiliation === "Internal") || [];

  return {
    id: call.id,
    title: call.title,
    date: call.started,
    duration_minutes: call.duration ? Math.round(call.duration / 60) : 0,
    type: call.media,
    direction: call.direction,
    internal_participants: internalParties.map((p) => p.name).join(", "),
    external_participants: externalParties
      .map((p) => `${p.name}${p.title ? ` (${p.title})` : ""}`)
      .join(", "),
    deal_ids: call.dealIds,
  };
}

// Helper to format deal activity
function formatDealActivity(activity: GongDealActivity) {
  return {
    deal_id: activity.dealId,
    deal_name: activity.dealName,
    stage: activity.stage,
    amount: activity.amount,
    close_date: activity.closeDate,
    calls: {
      count: activity.recentCalls.count,
      last_call: activity.recentCalls.lastCallDate,
      total_minutes: activity.recentCalls.totalDuration
        ? Math.round(activity.recentCalls.totalDuration / 60)
        : 0,
    },
    engagement: {
      score: activity.engagement.score,
      trend: activity.engagement.trend,
      risk_level: activity.engagement.riskLevel,
    },
  };
}

export function createToolHandlers(client: GongClient) {
  return {
    get_recent_calls: async (args: { days_back?: number }) => {
      const calls = await client.getRecentCalls(args.days_back || 7);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: calls.length,
                period_days: args.days_back || 7,
                calls: calls.map(formatCall),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_call_details: async (args: { call_id: string }) => {
      const call = await client.getCall(args.call_id);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                call: {
                  ...formatCall(call),
                  url: call.url,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_open_deals: async () => {
      const deals = await client.getOpenDeals();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: deals.length,
                total_pipeline: deals.reduce((sum, d) => sum + (d.amount || 0), 0),
                deals: deals.map((d: GongDeal) => ({
                  id: d.id,
                  name: d.name,
                  amount: d.amount,
                  stage: d.stage,
                  probability: d.probability,
                  close_date: d.closeDate,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_important_deals: async () => {
      const deals = await client.getImportantDeals();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: deals.length,
                description:
                  "Deals ranked by importance (risk level and deal size)",
                deals: deals.map(formatDealActivity),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_at_risk_deals: async () => {
      const deals = await client.getAtRiskDeals();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: deals.length,
                alert: deals.length > 0,
                description: "Deals with low engagement that need attention",
                deals: deals.map(formatDealActivity),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_deal_activity: async (args: { deal_id: string }) => {
      const activity = await client.getDealActivity(args.deal_id);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                deal: formatDealActivity(activity),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    search_calls: async (args: { query: string; days_back?: number }) => {
      const calls = await client.getRecentCalls(args.days_back || 30);
      const query = args.query.toLowerCase();

      const matchingCalls = calls.filter((call) => {
        const titleMatch = call.title?.toLowerCase().includes(query);
        const partyMatch = call.parties?.some(
          (p) =>
            p.name?.toLowerCase().includes(query) ||
            p.emailAddress?.toLowerCase().includes(query)
        );
        return titleMatch || partyMatch;
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                query: args.query,
                count: matchingCalls.length,
                calls: matchingCalls.map(formatCall),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_team_activity: async (args: { days_back?: number }) => {
      const [calls, deals] = await Promise.all([
        client.getRecentCalls(args.days_back || 7),
        client.getOpenDeals(),
      ]);

      const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
      const uniqueDealsWithCalls = new Set(calls.flatMap((c) => c.dealIds || []));

      const dealsWithoutRecentCalls = deals.filter(
        (d) => !uniqueDealsWithCalls.has(d.id)
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                period_days: args.days_back || 7,
                calls: {
                  total: calls.length,
                  total_hours: Math.round(totalDuration / 3600 * 10) / 10,
                  by_type: {
                    video: calls.filter((c) => c.media === "Video").length,
                    audio: calls.filter((c) => c.media === "Audio").length,
                  },
                },
                deals: {
                  total_open: deals.length,
                  with_recent_calls: uniqueDealsWithCalls.size,
                  without_recent_calls: dealsWithoutRecentCalls.length,
                  needing_attention: dealsWithoutRecentCalls.map((d) => ({
                    id: d.id,
                    name: d.name,
                    amount: d.amount,
                    stage: d.stage,
                  })),
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
