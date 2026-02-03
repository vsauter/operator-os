import type {
  HubSpotContact,
  HubSpotCompany,
  HubSpotDeal,
  HubSpotOwner,
  EnrichedHubSpotDeal,
  HubSpotEngagement,
  HubSpotPipeline,
  HubSpotSearchResponse,
  PipelineSummary,
  CRMMetrics,
} from "./types.js";

export class HubSpotClient {
  private accessToken: string;
  private baseUrl: string;
  private ownerCache: Map<string, HubSpotOwner> = new Map();
  private ownersFetched: boolean = false;

  constructor(
    accessToken: string,
    baseUrl: string = "https://api.hubapi.com"
  ) {
    this.accessToken = accessToken;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HubSpot API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  // ==================== CONTACTS ====================

  async getContacts(limit: number = 100): Promise<HubSpotContact[]> {
    const properties = [
      "email", "firstname", "lastname", "phone", "company",
      "jobtitle", "lifecyclestage", "hs_lead_status", "createdate", "lastmodifieddate"
    ].join(",");

    const response = await this.request<HubSpotSearchResponse<HubSpotContact>>(
      `/crm/v3/objects/contacts?limit=${limit}&properties=${properties}`
    );

    return response.results || [];
  }

  async getContact(contactId: string): Promise<HubSpotContact> {
    const properties = [
      "email", "firstname", "lastname", "phone", "company",
      "jobtitle", "lifecyclestage", "hs_lead_status", "createdate", "lastmodifieddate"
    ].join(",");

    return this.request<HubSpotContact>(
      `/crm/v3/objects/contacts/${contactId}?properties=${properties}`
    );
  }

  async searchContacts(query: string, limit: number = 20): Promise<HubSpotContact[]> {
    const response = await this.request<HubSpotSearchResponse<HubSpotContact>>(
      "/crm/v3/objects/contacts/search",
      {
        method: "POST",
        body: JSON.stringify({
          query,
          limit,
          properties: [
            "email", "firstname", "lastname", "phone", "company",
            "jobtitle", "lifecyclestage", "hs_lead_status"
          ],
        }),
      }
    );

    return response.results || [];
  }

  async getRecentContacts(daysBack: number = 7): Promise<HubSpotContact[]> {
    const fromDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    const response = await this.request<HubSpotSearchResponse<HubSpotContact>>(
      "/crm/v3/objects/contacts/search",
      {
        method: "POST",
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "createdate",
                  operator: "GTE",
                  value: fromDate,
                },
              ],
            },
          ],
          sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
          limit: 100,
          properties: [
            "email", "firstname", "lastname", "phone", "company",
            "jobtitle", "lifecyclestage", "hs_lead_status", "createdate"
          ],
        }),
      }
    );

    return response.results || [];
  }

  // ==================== COMPANIES ====================

  async getCompanies(limit: number = 100): Promise<HubSpotCompany[]> {
    const properties = [
      "name", "domain", "industry", "phone", "city", "state", "country",
      "numberofemployees", "annualrevenue", "lifecyclestage", "hs_lead_status"
    ].join(",");

    const response = await this.request<HubSpotSearchResponse<HubSpotCompany>>(
      `/crm/v3/objects/companies?limit=${limit}&properties=${properties}`
    );

    return response.results || [];
  }

  async getCompany(companyId: string): Promise<HubSpotCompany> {
    const properties = [
      "name", "domain", "industry", "phone", "city", "state", "country",
      "numberofemployees", "annualrevenue", "lifecyclestage", "hs_lead_status"
    ].join(",");

    return this.request<HubSpotCompany>(
      `/crm/v3/objects/companies/${companyId}?properties=${properties}`
    );
  }

  async searchCompanies(query: string, limit: number = 20): Promise<HubSpotCompany[]> {
    const response = await this.request<HubSpotSearchResponse<HubSpotCompany>>(
      "/crm/v3/objects/companies/search",
      {
        method: "POST",
        body: JSON.stringify({
          query,
          limit,
          properties: [
            "name", "domain", "industry", "numberofemployees", "annualrevenue"
          ],
        }),
      }
    );

    return response.results || [];
  }

  async getCompanyDeals(companyId: string): Promise<HubSpotDeal[]> {
    // Get deal IDs associated with the company
    const assocResponse = await this.request<{
      results: Array<{ id: string; type: string }>;
    }>(`/crm/v3/objects/companies/${companyId}/associations/deals`);

    const dealIds = assocResponse.results?.map((r) => r.id) || [];
    if (dealIds.length === 0) {
      return [];
    }

    // Fetch deal details for each ID
    const properties = [
      "dealname", "amount", "dealstage", "pipeline", "closedate",
      "createdate", "hubspot_owner_id", "solutions_engineer",
      "hs_deal_stage_probability", "product", "hs_next_step"
    ].join(",");

    const deals: HubSpotDeal[] = [];
    for (const dealId of dealIds) {
      try {
        const deal = await this.request<HubSpotDeal>(
          `/crm/v3/objects/deals/${dealId}?properties=${properties}`
        );
        deals.push(deal);
      } catch (error) {
        console.error(`Failed to fetch deal ${dealId}:`, error);
      }
    }

    return deals;
  }

  async getCompanyDealsWithOwners(companyId: string): Promise<EnrichedHubSpotDeal[]> {
    await this.getOwners();
    const deals = await this.getCompanyDeals(companyId);
    return Promise.all(deals.map((deal) => this.enrichDealWithOwners(deal)));
  }

  async searchCompanyDealsWithOwners(companyName: string): Promise<{
    company: HubSpotCompany | null;
    deals: EnrichedHubSpotDeal[];
  }> {
    // First, find the company
    const companies = await this.searchCompanies(companyName, 5);
    if (companies.length === 0) {
      return { company: null, deals: [] };
    }

    // Use the first matching company
    const company = companies[0];

    // Get deals for that company with owner names
    const deals = await this.getCompanyDealsWithOwners(company.id);

    return { company, deals };
  }

  // ==================== DEALS ====================

  async getDeals(limit: number = 100): Promise<HubSpotDeal[]> {
    const properties = [
      "dealname", "amount", "dealstage", "pipeline", "closedate",
      "createdate", "hs_lastmodifieddate", "hubspot_owner_id", "solutions_engineer",
      "hs_deal_stage_probability", "product", "hs_next_step"
    ].join(",");

    const response = await this.request<HubSpotSearchResponse<HubSpotDeal>>(
      `/crm/v3/objects/deals?limit=${limit}&properties=${properties}`
    );

    return response.results || [];
  }

  async getDeal(dealId: string): Promise<HubSpotDeal> {
    const properties = [
      "dealname", "amount", "dealstage", "pipeline", "closedate",
      "createdate", "hs_lastmodifieddate", "hubspot_owner_id", "solutions_engineer",
      "hs_deal_stage_probability", "product", "hs_next_step"
    ].join(",");

    return this.request<HubSpotDeal>(
      `/crm/v3/objects/deals/${dealId}?properties=${properties}`
    );
  }

  async getOpenDeals(): Promise<HubSpotDeal[]> {
    const response = await this.request<HubSpotSearchResponse<HubSpotDeal>>(
      "/crm/v3/objects/deals/search",
      {
        method: "POST",
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "hs_is_closed",
                  operator: "EQ",
                  value: "false",
                },
              ],
            },
          ],
          sorts: [{ propertyName: "amount", direction: "DESCENDING" }],
          limit: 100,
          properties: [
            "dealname", "amount", "dealstage", "pipeline", "closedate",
            "hubspot_owner_id", "solutions_engineer", "hs_deal_stage_probability",
            "product", "hs_next_step"
          ],
        }),
      }
    );

    return response.results || [];
  }

  async getDealsClosingSoon(daysAhead: number = 30): Promise<HubSpotDeal[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const response = await this.request<HubSpotSearchResponse<HubSpotDeal>>(
      "/crm/v3/objects/deals/search",
      {
        method: "POST",
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "closedate",
                  operator: "GTE",
                  value: now.toISOString(),
                },
                {
                  propertyName: "closedate",
                  operator: "LTE",
                  value: futureDate.toISOString(),
                },
                {
                  propertyName: "hs_is_closed",
                  operator: "EQ",
                  value: "false",
                },
              ],
            },
          ],
          sorts: [{ propertyName: "closedate", direction: "ASCENDING" }],
          limit: 100,
          properties: [
            "dealname", "amount", "dealstage", "pipeline", "closedate",
            "hubspot_owner_id", "solutions_engineer", "hs_deal_stage_probability"
          ],
        }),
      }
    );

    return response.results || [];
  }

  async searchDeals(query: string, limit: number = 20): Promise<HubSpotDeal[]> {
    const response = await this.request<HubSpotSearchResponse<HubSpotDeal>>(
      "/crm/v3/objects/deals/search",
      {
        method: "POST",
        body: JSON.stringify({
          query,
          limit,
          properties: [
            "dealname", "amount", "dealstage", "pipeline", "closedate",
            "hubspot_owner_id", "solutions_engineer", "hs_deal_stage_probability"
          ],
        }),
      }
    );

    return response.results || [];
  }

  // ==================== OWNERS ====================

  async getOwners(): Promise<HubSpotOwner[]> {
    if (this.ownersFetched) {
      return Array.from(this.ownerCache.values());
    }

    try {
      const response = await this.request<{ results: HubSpotOwner[] }>(
        "/crm/v3/owners?limit=500"
      );

      const owners = response.results || [];
      owners.forEach((owner) => {
        this.ownerCache.set(owner.id, owner);
      });
      this.ownersFetched = true;

      return owners;
    } catch (error) {
      console.error("Failed to fetch owners:", error);
      return [];
    }
  }

  async getOwnerById(ownerId: string): Promise<HubSpotOwner | null> {
    if (this.ownerCache.has(ownerId)) {
      return this.ownerCache.get(ownerId) || null;
    }

    if (!this.ownersFetched) {
      await this.getOwners();
      return this.ownerCache.get(ownerId) || null;
    }

    return null;
  }

  private async enrichDealWithOwners(deal: HubSpotDeal): Promise<EnrichedHubSpotDeal> {
    const enriched: EnrichedHubSpotDeal = { ...deal };

    if (deal.properties.hubspot_owner_id) {
      const owner = await this.getOwnerById(deal.properties.hubspot_owner_id);
      if (owner) {
        enriched.ownerName = `${owner.firstName} ${owner.lastName}`.trim();
        enriched.ownerEmail = owner.email;
      }
    }

    if (deal.properties.solutions_engineer) {
      const se = await this.getOwnerById(deal.properties.solutions_engineer);
      if (se) {
        enriched.solutionsEngineerName = `${se.firstName} ${se.lastName}`.trim();
        enriched.solutionsEngineerEmail = se.email;
      }
    }

    return enriched;
  }

  async getDealsWithOwners(limit: number = 100): Promise<EnrichedHubSpotDeal[]> {
    await this.getOwners();
    const deals = await this.getDeals(limit);
    return Promise.all(deals.map((deal) => this.enrichDealWithOwners(deal)));
  }

  async getOpenDealsWithOwners(): Promise<EnrichedHubSpotDeal[]> {
    await this.getOwners();
    const deals = await this.getOpenDeals();
    return Promise.all(deals.map((deal) => this.enrichDealWithOwners(deal)));
  }

  async searchDealsWithOwners(query: string, limit: number = 20): Promise<EnrichedHubSpotDeal[]> {
    await this.getOwners();
    const deals = await this.searchDeals(query, limit);
    return Promise.all(deals.map((deal) => this.enrichDealWithOwners(deal)));
  }

  // ==================== PIPELINES ====================

  async getPipelines(): Promise<HubSpotPipeline[]> {
    const response = await this.request<{ results: HubSpotPipeline[] }>(
      "/crm/v3/pipelines/deals"
    );

    return response.results || [];
  }

  async getPipelineSummary(): Promise<PipelineSummary[]> {
    const [pipelines, deals] = await Promise.all([
      this.getPipelines(),
      this.getOpenDeals(),
    ]);

    return pipelines.map((pipeline) => {
      const pipelineDeals = deals.filter(
        (d) => d.properties.pipeline === pipeline.id
      );

      const stages = pipeline.stages.map((stage) => {
        const stageDeals = pipelineDeals.filter(
          (d) => d.properties.dealstage === stage.id
        );
        const totalValue = stageDeals.reduce(
          (sum, d) => sum + (parseFloat(d.properties.amount || "0") || 0),
          0
        );

        return {
          name: stage.label,
          count: stageDeals.length,
          totalValue,
        };
      });

      const totalValue = pipelineDeals.reduce(
        (sum, d) => sum + (parseFloat(d.properties.amount || "0") || 0),
        0
      );

      return {
        pipeline: pipeline.label,
        stages,
        totalDeals: pipelineDeals.length,
        totalValue,
      };
    });
  }

  // ==================== ENGAGEMENTS/ACTIVITIES ====================

  async getRecentEngagements(daysBack: number = 7): Promise<HubSpotEngagement[]> {
    const fromDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).getTime();

    const response = await this.request<HubSpotSearchResponse<HubSpotEngagement>>(
      "/crm/v3/objects/engagements/search",
      {
        method: "POST",
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "hs_timestamp",
                  operator: "GTE",
                  value: fromDate.toString(),
                },
              ],
            },
          ],
          sorts: [{ propertyName: "hs_timestamp", direction: "DESCENDING" }],
          limit: 100,
          properties: [
            "hs_timestamp", "hs_activity_type", "hs_engagement_type",
            "hs_body_preview", "hubspot_owner_id"
          ],
        }),
      }
    );

    return response.results || [];
  }

  // ==================== METRICS/SUMMARY ====================

  async getCRMMetrics(): Promise<CRMMetrics> {
    const [contacts, recentContacts, companies, openDeals, closingSoon] = await Promise.all([
      this.getContacts(1).then((r) => r.length > 0),
      this.getRecentContacts(7),
      this.getCompanies(1).then((r) => r.length > 0),
      this.getOpenDeals(),
      this.getDealsClosingSoon(14),
    ]);

    const totalPipelineValue = openDeals.reduce(
      (sum, d) => sum + (parseFloat(d.properties.amount || "0") || 0),
      0
    );

    return {
      contacts: {
        total: contacts ? 100 : 0,
        recentlyCreated: recentContacts.length,
      },
      companies: {
        total: companies ? 100 : 0,
      },
      deals: {
        open: openDeals.length,
        closingSoon: closingSoon.length,
        totalPipelineValue,
      },
    };
  }
}

// Mock client for development/testing without API access
export class MockHubSpotClient extends HubSpotClient {
  private mockContacts: import("./types.js").HubSpotContact[] = [
    {
      id: "contact_001",
      properties: {
        email: "john.smith@acme.com",
        firstname: "John",
        lastname: "Smith",
        company: "Acme Corp",
        jobtitle: "VP of Engineering",
        lifecyclestage: "opportunity",
        createdate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "contact_002",
      properties: {
        email: "jane.doe@techstart.io",
        firstname: "Jane",
        lastname: "Doe",
        company: "TechStart Inc",
        jobtitle: "CTO",
        lifecyclestage: "lead",
        createdate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  private mockCompanies: import("./types.js").HubSpotCompany[] = [
    {
      id: "company_001",
      properties: {
        name: "Acme Corp",
        domain: "acme.com",
        industry: "Technology",
        numberofemployees: "500",
        annualrevenue: "50000000",
      },
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "company_002",
      properties: {
        name: "TechStart Inc",
        domain: "techstart.io",
        industry: "Software",
        numberofemployees: "50",
        annualrevenue: "5000000",
      },
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  private mockDeals: import("./types.js").HubSpotDeal[] = [
    {
      id: "deal_001",
      properties: {
        dealname: "Acme Corp - Enterprise License",
        amount: "150000",
        dealstage: "contractsent",
        pipeline: "default",
        closedate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        hubspot_owner_id: "owner_001",
        hs_deal_stage_probability: "0.8",
      },
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "deal_002",
      properties: {
        dealname: "TechStart - Growth Plan",
        amount: "45000",
        dealstage: "qualifiedtobuy",
        pipeline: "default",
        closedate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        hubspot_owner_id: "owner_001",
        hs_deal_stage_probability: "0.4",
      },
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "deal_003",
      properties: {
        dealname: "Enterprise Co - Platform Deal",
        amount: "500000",
        dealstage: "presentationscheduled",
        pipeline: "default",
        closedate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        hubspot_owner_id: "owner_002",
        hs_deal_stage_probability: "0.6",
      },
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  private mockOwners: import("./types.js").HubSpotOwner[] = [
    {
      id: "owner_001",
      email: "sarah@company.com",
      firstName: "Sarah",
      lastName: "Chen",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
    },
    {
      id: "owner_002",
      email: "mike@company.com",
      firstName: "Mike",
      lastName: "Johnson",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
    },
  ];

  constructor() {
    super("mock-token", "https://api.hubapi.com");
  }

  async getContacts(_limit?: number): Promise<import("./types.js").HubSpotContact[]> {
    return this.mockContacts;
  }

  async getContact(contactId: string): Promise<import("./types.js").HubSpotContact> {
    const contact = this.mockContacts.find((c) => c.id === contactId);
    if (!contact) throw new Error(`Contact not found: ${contactId}`);
    return contact;
  }

  async searchContacts(query: string, _limit?: number): Promise<import("./types.js").HubSpotContact[]> {
    const q = query.toLowerCase();
    return this.mockContacts.filter(
      (c) =>
        c.properties.firstname?.toLowerCase().includes(q) ||
        c.properties.lastname?.toLowerCase().includes(q) ||
        c.properties.email?.toLowerCase().includes(q) ||
        c.properties.company?.toLowerCase().includes(q)
    );
  }

  async getRecentContacts(_daysBack?: number): Promise<import("./types.js").HubSpotContact[]> {
    return this.mockContacts;
  }

  async getCompanies(_limit?: number): Promise<import("./types.js").HubSpotCompany[]> {
    return this.mockCompanies;
  }

  async getCompany(companyId: string): Promise<import("./types.js").HubSpotCompany> {
    const company = this.mockCompanies.find((c) => c.id === companyId);
    if (!company) throw new Error(`Company not found: ${companyId}`);
    return company;
  }

  async searchCompanies(query: string, _limit?: number): Promise<import("./types.js").HubSpotCompany[]> {
    const q = query.toLowerCase();
    return this.mockCompanies.filter(
      (c) =>
        c.properties.name?.toLowerCase().includes(q) ||
        c.properties.domain?.toLowerCase().includes(q)
    );
  }

  async getDeals(_limit?: number): Promise<import("./types.js").HubSpotDeal[]> {
    return this.mockDeals;
  }

  async getDeal(dealId: string): Promise<import("./types.js").HubSpotDeal> {
    const deal = this.mockDeals.find((d) => d.id === dealId);
    if (!deal) throw new Error(`Deal not found: ${dealId}`);
    return deal;
  }

  async getOpenDeals(): Promise<import("./types.js").HubSpotDeal[]> {
    return this.mockDeals;
  }

  async getDealsClosingSoon(_daysAhead?: number): Promise<import("./types.js").HubSpotDeal[]> {
    return this.mockDeals.slice(0, 2);
  }

  async searchDeals(query: string, _limit?: number): Promise<import("./types.js").HubSpotDeal[]> {
    const q = query.toLowerCase();
    return this.mockDeals.filter((d) =>
      d.properties.dealname?.toLowerCase().includes(q)
    );
  }

  async getOwners(): Promise<import("./types.js").HubSpotOwner[]> {
    return this.mockOwners;
  }

  async getOwnerById(ownerId: string): Promise<import("./types.js").HubSpotOwner | null> {
    return this.mockOwners.find((o) => o.id === ownerId) || null;
  }

  async getPipelines(): Promise<import("./types.js").HubSpotPipeline[]> {
    return [
      {
        id: "default",
        label: "Sales Pipeline",
        displayOrder: 0,
        stages: [
          { id: "appointmentscheduled", label: "Appointment Scheduled", displayOrder: 0, metadata: { probability: "0.2" } },
          { id: "qualifiedtobuy", label: "Qualified to Buy", displayOrder: 1, metadata: { probability: "0.4" } },
          { id: "presentationscheduled", label: "Presentation Scheduled", displayOrder: 2, metadata: { probability: "0.6" } },
          { id: "contractsent", label: "Contract Sent", displayOrder: 3, metadata: { probability: "0.8" } },
          { id: "closedwon", label: "Closed Won", displayOrder: 4, metadata: { probability: "1", isClosed: "true" } },
          { id: "closedlost", label: "Closed Lost", displayOrder: 5, metadata: { probability: "0", isClosed: "true" } },
        ],
      },
    ];
  }

  async getRecentEngagements(_daysBack?: number): Promise<import("./types.js").HubSpotEngagement[]> {
    return [];
  }
}
