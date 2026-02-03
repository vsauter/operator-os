import { z } from "zod";
import type { HubSpotClient } from "./client.js";
import type {
  HubSpotContact,
  HubSpotCompany,
  HubSpotDeal,
  EnrichedHubSpotDeal,
} from "./types.js";

export const toolDefinitions = {
  get_contacts: {
    description:
      "Get contacts from HubSpot CRM. Returns contact details including email, name, company, and lifecycle stage.",
    schema: {
      limit: z
        .number()
        .default(20)
        .describe("Maximum number of contacts to return (default: 20)"),
    },
  },

  get_contact: {
    description: "Get detailed information about a specific HubSpot contact.",
    schema: {
      contact_id: z.string().describe("The HubSpot contact ID"),
    },
  },

  search_contacts: {
    description:
      "Search for contacts in HubSpot by name, email, or company. Returns matching contacts.",
    schema: {
      query: z.string().describe("Search query (name, email, or company)"),
      limit: z.number().default(20).describe("Maximum results (default: 20)"),
    },
  },

  get_recent_contacts: {
    description:
      "Get recently created contacts from HubSpot. Useful for tracking new leads.",
    schema: {
      days_back: z
        .number()
        .default(7)
        .describe("Number of days to look back (default: 7)"),
    },
  },

  get_companies: {
    description:
      "Get companies from HubSpot CRM. Returns company details including name, industry, and revenue.",
    schema: {
      limit: z
        .number()
        .default(20)
        .describe("Maximum number of companies to return (default: 20)"),
    },
  },

  get_company: {
    description: "Get detailed information about a specific HubSpot company.",
    schema: {
      company_id: z.string().describe("The HubSpot company ID"),
    },
  },

  search_companies: {
    description:
      "Search for companies in HubSpot by name or domain. Returns matching companies.",
    schema: {
      query: z.string().describe("Search query (company name or domain)"),
      limit: z.number().default(20).describe("Maximum results (default: 20)"),
    },
  },

  get_deals: {
    description:
      "Get deals from HubSpot CRM. Returns deal details including amount, stage, and close date.",
    schema: {
      limit: z
        .number()
        .default(20)
        .describe("Maximum number of deals to return (default: 20)"),
    },
  },

  get_deal: {
    description: "Get detailed information about a specific HubSpot deal.",
    schema: {
      deal_id: z.string().describe("The HubSpot deal ID"),
    },
  },

  get_open_deals: {
    description:
      "Get all open deals from HubSpot, sorted by amount. Includes owner and stage information.",
    schema: {},
  },

  get_open_deals_with_owners: {
    description:
      "Get all open deals with owner names resolved. Includes deal owner and solutions engineer information.",
    schema: {},
  },

  get_deals_closing_soon: {
    description:
      "Get deals that are closing soon. Useful for prioritizing deals that need attention.",
    schema: {
      days_ahead: z
        .number()
        .default(30)
        .describe("Number of days ahead to look (default: 30)"),
    },
  },

  search_deals: {
    description:
      "Search for deals in HubSpot by name. Returns matching deals with amount and stage.",
    schema: {
      query: z.string().describe("Search query (deal name)"),
      limit: z.number().default(20).describe("Maximum results (default: 20)"),
    },
  },

  search_deals_with_owners: {
    description:
      "Search for deals in HubSpot by name with owner names resolved. Returns matching deals including AE and SE names.",
    schema: {
      query: z.string().describe("Search query (deal name)"),
      limit: z.number().default(20).describe("Maximum results (default: 20)"),
    },
  },

  get_company_deals: {
    description:
      "Get all deals associated with a company by searching for the company name first, then retrieving its deals. More reliable than searching deals by name. Includes owner names.",
    schema: {
      company_name: z.string().describe("Company name to search for"),
    },
  },

  get_owners: {
    description:
      "Get all HubSpot owners (sales reps). Returns owner details including name and email.",
    schema: {},
  },

  get_pipelines: {
    description:
      "Get all deal pipelines from HubSpot. Returns pipeline stages and their order.",
    schema: {},
  },

  get_pipeline_summary: {
    description:
      "Get a summary of all pipelines with deal counts and values per stage. Useful for sales forecasting.",
    schema: {},
  },

  get_recent_engagements: {
    description:
      "Get recent engagements/activities from HubSpot. Includes calls, emails, and meetings.",
    schema: {
      days_back: z
        .number()
        .default(7)
        .describe("Number of days to look back (default: 7)"),
    },
  },

  get_crm_metrics: {
    description:
      "Get high-level CRM metrics including contact counts, open deals, and pipeline value.",
    schema: {},
  },
};

// Helper to format contact for response
function formatContact(contact: HubSpotContact) {
  return {
    id: contact.id,
    email: contact.properties.email,
    name: [contact.properties.firstname, contact.properties.lastname]
      .filter(Boolean)
      .join(" "),
    company: contact.properties.company,
    job_title: contact.properties.jobtitle,
    lifecycle_stage: contact.properties.lifecyclestage,
    lead_status: contact.properties.hs_lead_status,
    created: contact.properties.createdate,
  };
}

// Helper to format company for response
function formatCompany(company: HubSpotCompany) {
  return {
    id: company.id,
    name: company.properties.name,
    domain: company.properties.domain,
    industry: company.properties.industry,
    employees: company.properties.numberofemployees,
    revenue: company.properties.annualrevenue,
    location: [
      company.properties.city,
      company.properties.state,
      company.properties.country,
    ]
      .filter(Boolean)
      .join(", "),
    lifecycle_stage: company.properties.lifecyclestage,
  };
}

// Helper to format deal for response
function formatDeal(deal: HubSpotDeal) {
  return {
    id: deal.id,
    name: deal.properties.dealname,
    amount: deal.properties.amount ? parseFloat(deal.properties.amount) : null,
    stage: deal.properties.dealstage,
    pipeline: deal.properties.pipeline,
    close_date: deal.properties.closedate,
    probability: deal.properties.hs_deal_stage_probability,
    owner_id: deal.properties.hubspot_owner_id,
    product: deal.properties.product,
    next_step: deal.properties.hs_next_step,
  };
}

// Helper to format enriched deal
function formatEnrichedDeal(deal: EnrichedHubSpotDeal) {
  return {
    ...formatDeal(deal),
    owner_name: deal.ownerName,
    owner_email: deal.ownerEmail,
    solutions_engineer_name: deal.solutionsEngineerName,
    solutions_engineer_email: deal.solutionsEngineerEmail,
  };
}

export function createToolHandlers(client: HubSpotClient) {
  return {
    get_contacts: async (args: { limit?: number }) => {
      const contacts = await client.getContacts(args.limit || 20);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: contacts.length,
                contacts: contacts.map(formatContact),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_contact: async (args: { contact_id: string }) => {
      const contact = await client.getContact(args.contact_id);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ contact: formatContact(contact) }, null, 2),
          },
        ],
      };
    },

    search_contacts: async (args: { query: string; limit?: number }) => {
      const contacts = await client.searchContacts(
        args.query,
        args.limit || 20
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                query: args.query,
                count: contacts.length,
                contacts: contacts.map(formatContact),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_recent_contacts: async (args: { days_back?: number }) => {
      const contacts = await client.getRecentContacts(args.days_back || 7);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                period_days: args.days_back || 7,
                count: contacts.length,
                contacts: contacts.map(formatContact),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_companies: async (args: { limit?: number }) => {
      const companies = await client.getCompanies(args.limit || 20);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: companies.length,
                companies: companies.map(formatCompany),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_company: async (args: { company_id: string }) => {
      const company = await client.getCompany(args.company_id);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ company: formatCompany(company) }, null, 2),
          },
        ],
      };
    },

    search_companies: async (args: { query: string; limit?: number }) => {
      const companies = await client.searchCompanies(
        args.query,
        args.limit || 20
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                query: args.query,
                count: companies.length,
                companies: companies.map(formatCompany),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_deals: async (args: { limit?: number }) => {
      const deals = await client.getDeals(args.limit || 20);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: deals.length,
                deals: deals.map(formatDeal),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_deal: async (args: { deal_id: string }) => {
      const deal = await client.getDeal(args.deal_id);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ deal: formatDeal(deal) }, null, 2),
          },
        ],
      };
    },

    get_open_deals: async () => {
      const deals = await client.getOpenDeals();
      const totalPipeline = deals.reduce(
        (sum, d) => sum + (parseFloat(d.properties.amount || "0") || 0),
        0
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: deals.length,
                total_pipeline_value: totalPipeline,
                deals: deals.map(formatDeal),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_open_deals_with_owners: async () => {
      const deals = await client.getOpenDealsWithOwners();
      const totalPipeline = deals.reduce(
        (sum, d) => sum + (parseFloat(d.properties.amount || "0") || 0),
        0
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: deals.length,
                total_pipeline_value: totalPipeline,
                deals: deals.map(formatEnrichedDeal),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_deals_closing_soon: async (args: { days_ahead?: number }) => {
      const deals = await client.getDealsClosingSoon(args.days_ahead || 30);
      const totalValue = deals.reduce(
        (sum, d) => sum + (parseFloat(d.properties.amount || "0") || 0),
        0
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                days_ahead: args.days_ahead || 30,
                count: deals.length,
                total_value: totalValue,
                deals: deals.map(formatDeal),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    search_deals: async (args: { query: string; limit?: number }) => {
      const deals = await client.searchDeals(args.query, args.limit || 20);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                query: args.query,
                count: deals.length,
                deals: deals.map(formatDeal),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    search_deals_with_owners: async (args: { query: string; limit?: number }) => {
      const deals = await client.searchDealsWithOwners(args.query, args.limit || 20);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                query: args.query,
                count: deals.length,
                deals: deals.map(formatEnrichedDeal),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_company_deals: async (args: { company_name: string }) => {
      try {
        const result = await client.searchCompanyDealsWithOwners(args.company_name);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  company_name: args.company_name,
                  company_found: result.company ? {
                    id: result.company.id,
                    name: result.company.properties.name,
                    domain: result.company.properties.domain,
                  } : null,
                  deals_count: result.deals.length,
                  deals: result.deals.map(formatEnrichedDeal),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  company_name: args.company_name,
                  error: error instanceof Error ? error.message : String(error),
                  note: "Failed to retrieve company deals. The company may not have any associated deals, or there may be an API permission issue.",
                },
                null,
                2
              ),
            },
          ],
        };
      }
    },

    get_owners: async () => {
      const owners = await client.getOwners();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: owners.length,
                owners: owners.map((o) => ({
                  id: o.id,
                  name: `${o.firstName} ${o.lastName}`.trim(),
                  email: o.email,
                  active: !o.archived,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_pipelines: async () => {
      const pipelines = await client.getPipelines();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: pipelines.length,
                pipelines: pipelines.map((p) => ({
                  id: p.id,
                  name: p.label,
                  stages: p.stages.map((s) => ({
                    id: s.id,
                    name: s.label,
                    probability: s.metadata.probability,
                    is_closed: s.metadata.isClosed === "true",
                  })),
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_pipeline_summary: async () => {
      const summary = await client.getPipelineSummary();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                pipelines: summary.map((p) => ({
                  name: p.pipeline,
                  total_deals: p.totalDeals,
                  total_value: p.totalValue,
                  stages: p.stages,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_recent_engagements: async (args: { days_back?: number }) => {
      const engagements = await client.getRecentEngagements(
        args.days_back || 7
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                period_days: args.days_back || 7,
                count: engagements.length,
                engagements: engagements.map((e) => ({
                  id: e.id,
                  type: e.properties.hs_engagement_type,
                  activity_type: e.properties.hs_activity_type,
                  timestamp: e.properties.hs_timestamp,
                  preview: e.properties.hs_body_preview,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    },

    get_crm_metrics: async () => {
      const metrics = await client.getCRMMetrics();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ metrics }, null, 2),
          },
        ],
      };
    },
  };
}
