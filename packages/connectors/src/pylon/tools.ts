import { z } from "zod";
import type { PylonClient } from "./client.js";
import type { PylonIssue, PylonAccount, IssueState, IssuePriority } from "./types.js";

export const toolDefinitions = {
  get_open_issues: {
    description:
      "Get all open issues from Pylon (states: new, waiting_on_you, waiting_on_customer, on_hold). Use this to see current support workload.",
    schema: {
      priority: z
        .enum(["low", "normal", "high", "urgent"])
        .array()
        .optional()
        .describe("Filter by priority levels"),
      state: z
        .enum(["new", "waiting_on_you", "waiting_on_customer", "on_hold"])
        .array()
        .optional()
        .describe("Filter by issue state"),
      tags: z.string().array().optional().describe("Filter by tags"),
    },
  },

  get_issues_waiting_on_team: {
    description:
      "Get issues that are waiting for your team to respond (states: new, waiting_on_you). These need immediate attention.",
    schema: {},
  },

  get_urgent_issues: {
    description:
      "Get high-priority and urgent issues that need immediate attention.",
    schema: {},
  },

  search_issues: {
    description:
      "Search issues by keyword. Searches issue titles and descriptions.",
    schema: {
      query: z.string().describe("Search query"),
      limit: z.number().default(20).describe("Maximum number of results"),
    },
  },

  get_issue_details: {
    description: "Get detailed information about a specific issue by ID.",
    schema: {
      issue_id: z.string().describe("The issue ID"),
    },
  },

  get_account_issues: {
    description:
      "Get all issues for a specific account (company) to understand their support history.",
    schema: {
      account_id: z.string().describe("The account ID"),
    },
  },

  get_accounts: {
    description:
      "Get all accounts (companies) in Pylon. Useful for getting an overview of customers.",
    schema: {
      limit: z.number().default(100).describe("Maximum number of accounts to return"),
    },
  },

  get_support_metrics: {
    description:
      "Get overall support metrics including open issue counts by state, urgent/high priority counts.",
    schema: {},
  },
};

// Helper to format issue for response
function formatIssue(issue: PylonIssue) {
  return {
    id: issue.id,
    title: issue.title,
    state: issue.state,
    priority: issue.priority,
    account: issue.account?.name || "Unknown",
    requester: issue.requester?.name || "Unknown",
    assignee: issue.assignee?.name || "Unassigned",
    tags: issue.tags || [],
    created_at: issue.created_at,
    channel: issue.channel,
  };
}

export function createToolHandlers(client: PylonClient) {
  return {
    get_open_issues: async (args: {
      priority?: IssuePriority[];
      state?: IssueState[];
      tags?: string[];
    }) => {
      const issues = await client.getIssues({
        state: args.state || ["new", "waiting_on_you", "waiting_on_customer", "on_hold"],
        priority: args.priority,
        tags: args.tags,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: issues.length,
                issues: issues.map(formatIssue),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_issues_waiting_on_team: async () => {
      const issues = await client.getIssuesWaitingOnTeam();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: issues.length,
                description: "Issues waiting for your team to respond",
                issues: issues.map(formatIssue),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_urgent_issues: async () => {
      const issues = await client.getUrgentIssues();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: issues.length,
                issues: issues.map(formatIssue),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    search_issues: async (args: { query: string; limit?: number }) => {
      const issues = await client.searchIssues(
        [{ field: "title", operator: "string_contains", value: args.query }],
        args.limit || 20
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                query: args.query,
                count: issues.length,
                issues: issues.map(formatIssue),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_issue_details: async (args: { issue_id: string }) => {
      const issue = await client.getIssue(args.issue_id);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                issue: {
                  ...formatIssue(issue),
                  description: issue.body_text,
                  updated_at: issue.updated_at,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_account_issues: async (args: { account_id: string }) => {
      const [account, issues] = await Promise.all([
        client.getAccount(args.account_id),
        client.getAccountIssues(args.account_id),
      ]);

      const openIssues = issues.filter((i) => i.state !== "closed");
      const waitingOnTeam = issues.filter(
        (i) => i.state === "new" || i.state === "waiting_on_you"
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                account: {
                  id: account.id,
                  name: account.name,
                  domain: account.primary_domain,
                  tags: account.tags,
                },
                summary: {
                  total_issues: issues.length,
                  open_issues: openIssues.length,
                  waiting_on_team: waitingOnTeam.length,
                },
                issues: issues.map(formatIssue),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_accounts: async (args: { limit?: number }) => {
      const accounts = await client.getAccounts(args.limit || 100);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: accounts.length,
                accounts: accounts.map((a: PylonAccount) => ({
                  id: a.id,
                  name: a.name,
                  domain: a.primary_domain,
                  tags: a.tags,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_support_metrics: async () => {
      const metrics = await client.getMetrics();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                metrics: {
                  total_open: metrics.total_open,
                  by_state: {
                    waiting_on_team: metrics.waiting_on_team,
                    waiting_on_customer: metrics.waiting_on_customer,
                    on_hold: metrics.on_hold,
                  },
                  by_priority: {
                    urgent: metrics.urgent_count,
                    high: metrics.high_priority_count,
                  },
                  needs_attention: metrics.waiting_on_team,
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
