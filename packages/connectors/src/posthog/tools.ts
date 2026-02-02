import { z } from "zod";
import type { PostHogClient } from "./client.js";
import type { PostHogEvent, PostHogPerson } from "./types.js";

export const toolDefinitions = {
  get_recent_events: {
    description:
      "Get recent events from PostHog. Returns event details including name, timestamp, and properties.",
    schema: {
      event: z.string().optional().describe("Filter by event name (e.g. $pageview, signup)"),
      limit: z.number().default(100).describe("Maximum number of events to return (default: 100)"),
    },
  },

  get_event_definitions: {
    description:
      "Get all tracked event types in PostHog with their 30-day volumes. Useful for understanding what events are being tracked.",
    schema: {},
  },

  get_persons: {
    description:
      "Get users/persons from PostHog. Returns user properties and distinct IDs.",
    schema: {
      search: z.string().optional().describe("Search query to filter persons"),
      limit: z.number().default(20).describe("Maximum number of persons to return"),
    },
  },

  get_active_users: {
    description:
      "Get active users count and their activity metrics over a time period.",
    schema: {
      days: z.number().default(30).describe("Number of days to analyze (default: 30)"),
    },
  },

  get_user_activity: {
    description:
      "Get the activity timeline for a specific user by their distinct ID. Shows their recent events.",
    schema: {
      distinct_id: z.string().describe("The user's distinct ID"),
      limit: z.number().default(50).describe("Maximum number of events to return"),
    },
  },

  get_event_counts: {
    description:
      "Get event counts grouped by event type over a time period. Useful for understanding usage patterns.",
    schema: {
      days: z.number().default(30).describe("Number of days to analyze (default: 30)"),
    },
  },

  run_hogql_query: {
    description:
      "Run a custom HogQL query for advanced analytics. HogQL is PostHog's SQL-like query language.",
    schema: {
      query: z.string().describe("The HogQL query to execute"),
    },
  },

  get_feature_flags: {
    description:
      "Get all feature flags and their current status (active/inactive).",
    schema: {},
  },

  get_cohorts: {
    description: "Get all cohorts with their names and user counts.",
    schema: {},
  },

  get_insights: {
    description:
      "Get saved insights/dashboards from PostHog.",
    schema: {
      limit: z.number().default(20).describe("Maximum number of insights to return"),
    },
  },
};

// Helper to format event for response
function formatEvent(event: PostHogEvent) {
  return {
    id: event.id,
    event: event.event,
    distinct_id: event.distinct_id,
    timestamp: event.timestamp,
    properties: event.properties,
  };
}

// Helper to format person for response
function formatPerson(person: PostHogPerson) {
  return {
    id: person.id,
    distinct_ids: person.distinct_ids,
    properties: person.properties,
    created_at: person.created_at,
  };
}

export function createToolHandlers(client: PostHogClient) {
  return {
    get_recent_events: async (args: { event?: string; limit?: number }) => {
      const events = await client.getRecentEvents(args.limit || 100, args.event);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: events.length,
                filter: args.event ? { event: args.event } : null,
                events: events.map(formatEvent),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_event_definitions: async () => {
      const definitions = await client.getEventDefinitions();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: definitions.length,
                events: definitions.map((d) => ({
                  name: d.name,
                  volume_30_day: d.volume_30_day,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_persons: async (args: { search?: string; limit?: number }) => {
      const persons = args.search
        ? await client.searchPersons(args.search, args.limit || 20)
        : await client.getPersons({ limit: args.limit || 20 });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: persons.length,
                search: args.search || null,
                persons: persons.map(formatPerson),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_active_users: async (args: { days?: number }) => {
      const result = await client.getActiveUsers(args.days || 30);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                period_days: args.days || 30,
                total_active_users: result.total,
                top_users: result.users.slice(0, 20).map((u) => ({
                  distinct_id: u.distinct_id,
                  event_count: u.event_count,
                  last_seen: u.last_seen,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_user_activity: async (args: { distinct_id: string; limit?: number }) => {
      const events = await client.getUserActivity(
        args.distinct_id,
        args.limit || 50
      );
      const person = await client.getPersonByDistinctId(args.distinct_id);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                distinct_id: args.distinct_id,
                person: person ? formatPerson(person) : null,
                event_count: events.length,
                events: events.map(formatEvent),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_event_counts: async (args: { days?: number }) => {
      const counts = await client.getEventCounts(args.days || 30);

      const totalEvents = counts.reduce((sum, c) => sum + c.count, 0);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                period_days: args.days || 30,
                total_events: totalEvents,
                unique_event_types: counts.length,
                events: counts.map((c) => ({
                  event: c.event,
                  count: c.count,
                  percentage: Math.round((c.count / totalEvents) * 100 * 10) / 10,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    run_hogql_query: async (args: { query: string }) => {
      const result = await client.queryHogQL(args.query);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                query: args.query,
                columns: result.columns,
                row_count: result.results.length,
                results: result.results,
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_feature_flags: async () => {
      const flags = await client.getFeatureFlags();

      const activeCount = flags.filter((f) => f.active).length;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                total: flags.length,
                active: activeCount,
                inactive: flags.length - activeCount,
                flags: flags.map((f) => ({
                  key: f.key,
                  name: f.name,
                  active: f.active,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_cohorts: async () => {
      const cohorts = await client.getCohorts();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: cohorts.length,
                cohorts: cohorts.map((c) => ({
                  id: c.id,
                  name: c.name,
                  description: c.description,
                  user_count: c.count,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_insights: async (args: { limit?: number }) => {
      const insights = await client.getInsights(args.limit || 20);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: insights.length,
                insights: insights.map((i) => ({
                  id: i.id,
                  name: i.name,
                  description: i.description,
                })),
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
