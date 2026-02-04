import type {
  GongCall,
  GongParty,
  GongApiCall,
  GongDeal,
  GongUser,
  GongDealActivity,
  CallFilters,
  DealFilters,
} from "./types.js";

export class GongClient {
  private accessKey: string;
  private accessKeySecret: string;
  private baseUrl: string;

  constructor(
    accessKey: string,
    accessKeySecret: string,
    baseUrl: string = "https://api.gong.io/v2"
  ) {
    this.accessKey = accessKey;
    this.accessKeySecret = accessKeySecret;
    // Normalize URL to ensure it ends with /v2
    let normalizedUrl = baseUrl.replace(/\/+$/, "");
    if (!normalizedUrl.endsWith("/v2")) {
      normalizedUrl += "/v2";
    }
    this.baseUrl = normalizedUrl;
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(
      `${this.accessKey}:${this.accessKeySecret}`
    ).toString("base64");
    return `Basic ${credentials}`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.getAuthHeader(),
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      // Gong returns 404 when no data matches the filter (e.g., no calls in time range).
      // Rethrow as a specific error so callers can handle it gracefully.
      const errorText = await response.text();
      const err = new Error(
        `Gong API error: ${response.status} ${response.statusText} - ${errorText}`
      );
      (err as any).status = response.status;
      throw err;
    }

    return response.json() as Promise<T>;
  }

  // ==================== Calls ====================

  // Map the raw API response (metaData wrapper + context at call level) to flat GongCall
  private mapApiCallToGongCall(apiCall: GongApiCall): GongCall {
    const meta = apiCall.metaData || {};
    const allContextObjects = apiCall.context?.flatMap(system => system.objects || []) || [];

    // Extract account names from CRM context fields (e.g. "Name" field on Account objects)
    const accountObjects = allContextObjects.filter(o => o.objectType === "Account");
    const accountNames = accountObjects
      .flatMap(o => o.fields || [])
      .filter(f => f.name === "Name" && f.value)
      .map(f => String(f.value));

    return {
      id: meta.id || "",
      title: meta.title,
      started: meta.started,
      duration: meta.duration,
      primaryUserId: meta.primaryUserId,
      direction: meta.direction as GongCall["direction"],
      scope: meta.scope as GongCall["scope"],
      media: meta.media as GongCall["media"],
      url: meta.url,
      parties: apiCall.parties?.map((p): GongParty => ({
        id: p.id || p.speakerId || "",
        emailAddress: p.emailAddress,
        name: p.name,
        title: p.title,
        affiliation: p.affiliation as GongParty["affiliation"],
      })),
      dealIds: allContextObjects
        .filter(o => o.objectType === "Deal" && o.objectId)
        .map(o => o.objectId!),
      accountIds: allContextObjects
        .filter(o => o.objectType === "Account" && o.objectId)
        .map(o => o.objectId!),
      accountNames: accountNames.length > 0 ? accountNames : undefined,
    };
  }

  /**
   * Fetch calls using POST /v2/calls/extensive with CRM context and party details.
   * This is the correct endpoint for listing calls with full data.
   */
  async getCalls(filters?: CallFilters, maxPages: number = 10): Promise<GongCall[]> {
    const allApiCalls: GongApiCall[] = [];
    let cursor: string | undefined;
    let pageCount = 0;

    do {
      const body: Record<string, unknown> = {
        contentSelector: {
          context: "Extended",
          exposedFields: {
            parties: true,
          },
        },
        filter: {} as Record<string, string>,
      };

      const filter = body.filter as Record<string, string>;
      if (filters?.fromDateTime) filter.fromDateTime = filters.fromDateTime;
      if (filters?.toDateTime) filter.toDateTime = filters.toDateTime;
      if (cursor) body.cursor = cursor;

      try {
        const response = await this.request<{
          calls: GongApiCall[];
          records?: { cursor?: string };
        }>("/calls/extensive", {
          method: "POST",
          body: JSON.stringify(body),
        });

        if (response.calls) {
          allApiCalls.push(...response.calls);
        }

        cursor = response.records?.cursor;
      } catch (err) {
        // Gong returns 404 when no calls exist in the time range — treat as empty
        if ((err as any).status === 404) {
          break;
        }
        throw err;
      }

      pageCount++;
    } while (cursor && pageCount < maxPages);

    return allApiCalls.map(c => this.mapApiCallToGongCall(c));
  }

  async getRecentCalls(daysBack: number = 7): Promise<GongCall[]> {
    const toDateTime = new Date().toISOString();
    const fromDateTime = new Date(
      Date.now() - daysBack * 24 * 60 * 60 * 1000
    ).toISOString();

    const calls = await this.getCalls({ fromDateTime, toDateTime });
    // Sort most recent first
    return calls.sort((a, b) => {
      const dateA = a.started ? new Date(a.started).getTime() : 0;
      const dateB = b.started ? new Date(b.started).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getCall(callId: string): Promise<GongCall> {
    const response = await this.request<{
      calls: GongApiCall[];
    }>("/calls/extensive", {
      method: "POST",
      body: JSON.stringify({
        filter: { callIds: [callId] },
        contentSelector: {
          context: "Extended",
          exposedFields: {
            parties: true,
          },
        },
      }),
    });

    const apiCall = response.calls?.[0];
    return apiCall ? this.mapApiCallToGongCall(apiCall) : { id: callId };
  }

  // ==================== Deals ====================
  // Note: Gong's API doesn't have a native deals endpoint.
  // Deals come from CRM integrations (Salesforce, HubSpot, etc.)
  // These methods throw errors for the real client but work in MockGongClient.

  async getDeals(_filters?: DealFilters): Promise<GongDeal[]> {
    throw new Error(
      "Gong API does not have a native deals endpoint. " +
      "Deals are synced from your CRM (Salesforce, HubSpot, etc.). " +
      "Use mock mode for testing or integrate with your CRM directly."
    );
  }

  async getOpenDeals(): Promise<GongDeal[]> {
    return this.getDeals({ status: ["Open"] });
  }

  async getDeal(_dealId: string): Promise<GongDeal> {
    throw new Error(
      "Gong API does not have a native deals endpoint. " +
      "Deals are synced from your CRM (Salesforce, HubSpot, etc.). " +
      "Use mock mode for testing or integrate with your CRM directly."
    );
  }

  // ==================== Users ====================

  async getUsers(): Promise<GongUser[]> {
    const response = await this.request<{ users: GongUser[] }>("/users");
    return response.users || [];
  }

  async getUser(userId: string): Promise<GongUser> {
    const response = await this.request<{ users: GongUser[] }>(
      `/users/${userId}`
    );
    return response.users[0];
  }

  // ==================== Computed Analytics ====================

  async getDealActivity(dealId: string): Promise<GongDealActivity> {
    const [deal, calls] = await Promise.all([
      this.getDeal(dealId),
      this.getCalls(),
    ]);

    const dealCalls = calls.filter((c) => c.dealIds?.includes(dealId));
    const sortedCalls = dealCalls.sort(
      (a, b) =>
        new Date(b.started || 0).getTime() - new Date(a.started || 0).getTime()
    );

    const totalDuration = dealCalls.reduce(
      (sum, c) => sum + (c.duration || 0),
      0
    );

    const daysSinceLastCall = sortedCalls[0]?.started
      ? Math.floor(
          (Date.now() - new Date(sortedCalls[0].started).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 999;

    let engagementScore = 100;
    if (daysSinceLastCall > 14) engagementScore -= 30;
    else if (daysSinceLastCall > 7) engagementScore -= 15;
    if (dealCalls.length < 2) engagementScore -= 20;
    if (dealCalls.length < 1) engagementScore -= 30;

    const riskLevel =
      engagementScore >= 70 ? "low" : engagementScore >= 40 ? "medium" : "high";

    return {
      dealId: deal.id,
      dealName: deal.name,
      stage: deal.stage,
      amount: deal.amount,
      closeDate: deal.closeDate,
      ownerId: deal.ownerId,
      recentCalls: {
        count: dealCalls.length,
        lastCallDate: sortedCalls[0]?.started,
        totalDuration,
      },
      engagement: {
        score: Math.max(0, engagementScore),
        trend:
          dealCalls.length > 2
            ? "increasing"
            : dealCalls.length > 0
            ? "stable"
            : "decreasing",
        riskLevel,
      },
    };
  }

  async getImportantDeals(): Promise<GongDealActivity[]> {
    const deals = await this.getOpenDeals();
    const calls = await this.getRecentCalls(30);

    const dealActivities: GongDealActivity[] = [];

    for (const deal of deals) {
      const dealCalls = calls.filter((c) => c.dealIds?.includes(deal.id));
      const sortedCalls = dealCalls.sort(
        (a, b) =>
          new Date(b.started || 0).getTime() -
          new Date(a.started || 0).getTime()
      );

      const totalDuration = dealCalls.reduce(
        (sum, c) => sum + (c.duration || 0),
        0
      );

      const daysSinceLastCall = sortedCalls[0]?.started
        ? Math.floor(
            (Date.now() - new Date(sortedCalls[0].started).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 999;

      let engagementScore = 100;
      if (daysSinceLastCall > 14) engagementScore -= 30;
      else if (daysSinceLastCall > 7) engagementScore -= 15;
      if (dealCalls.length < 2) engagementScore -= 20;
      if (dealCalls.length < 1) engagementScore -= 30;

      const riskLevel =
        engagementScore >= 70
          ? "low"
          : engagementScore >= 40
          ? "medium"
          : "high";

      dealActivities.push({
        dealId: deal.id,
        dealName: deal.name,
        stage: deal.stage,
        amount: deal.amount,
        closeDate: deal.closeDate,
        ownerId: deal.ownerId,
        recentCalls: {
          count: dealCalls.length,
          lastCallDate: sortedCalls[0]?.started,
          totalDuration,
        },
        engagement: {
          score: Math.max(0, engagementScore),
          trend:
            dealCalls.length > 2
              ? "increasing"
              : dealCalls.length > 0
              ? "stable"
              : "decreasing",
          riskLevel,
        },
      });
    }

    // Sort by importance: high risk first, then by amount
    return dealActivities.sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      const riskDiff =
        riskOrder[a.engagement.riskLevel] - riskOrder[b.engagement.riskLevel];
      if (riskDiff !== 0) return riskDiff;
      return (b.amount || 0) - (a.amount || 0);
    });
  }

  async getAtRiskDeals(): Promise<GongDealActivity[]> {
    const allDeals = await this.getImportantDeals();
    return allDeals.filter(
      (d) =>
        d.engagement.riskLevel === "high" || d.engagement.riskLevel === "medium"
    );
  }
}

// Mock client for development/testing without API access
export class MockGongClient extends GongClient {
  private mockCalls: GongCall[] = [
    {
      id: "call_001",
      title: "Discovery Call - Acme Corp",
      started: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 1800,
      primaryUserId: "user_001",
      direction: "Outbound",
      scope: "External",
      media: "Video",
      dealIds: ["deal_001"],
      accountIds: ["acc_001"],
      parties: [
        { id: "p1", name: "Sarah Chen", affiliation: "Internal" },
        { id: "p2", name: "John Smith", title: "VP Sales", affiliation: "External", emailAddress: "john@acme.com" },
      ],
    },
    {
      id: "call_002",
      title: "Demo - TechStart Inc",
      started: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 2700,
      primaryUserId: "user_001",
      direction: "Outbound",
      scope: "External",
      media: "Video",
      dealIds: ["deal_002"],
      accountIds: ["acc_002"],
      parties: [
        { id: "p1", name: "Sarah Chen", affiliation: "Internal" },
        { id: "p3", name: "Jane Doe", title: "CTO", affiliation: "External", emailAddress: "jane@techstart.io" },
      ],
    },
    {
      id: "call_003",
      title: "Negotiation - Enterprise Co",
      started: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 3600,
      primaryUserId: "user_002",
      direction: "Outbound",
      scope: "External",
      media: "Video",
      dealIds: ["deal_003"],
      accountIds: ["acc_003"],
      parties: [
        { id: "p4", name: "Mike Johnson", affiliation: "Internal" },
        { id: "p5", name: "Alice Brown", title: "CEO", affiliation: "External", emailAddress: "alice@enterprise.com" },
      ],
    },
    {
      id: "call_004",
      title: "Follow-up - Global Systems",
      started: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 1200,
      primaryUserId: "user_001",
      direction: "Outbound",
      scope: "External",
      media: "Video",
      dealIds: ["deal_004"],
      accountIds: ["acc_004"],
      parties: [
        { id: "p1", name: "Sarah Chen", affiliation: "Internal" },
        { id: "p6", name: "Bob Wilson", title: "Director", affiliation: "External", emailAddress: "bob@globalsys.com" },
      ],
    },
  ];

  private mockDeals: GongDeal[] = [
    {
      id: "deal_001",
      name: "Acme Corp - Enterprise License",
      amount: 150000,
      stage: "Negotiation",
      status: "Open",
      probability: 70,
      closeDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      ownerId: "user_001",
      createdDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "deal_002",
      name: "TechStart Inc - Growth Plan",
      amount: 45000,
      stage: "Demo",
      status: "Open",
      probability: 40,
      closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      ownerId: "user_001",
      createdDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "deal_003",
      name: "Enterprise Co - Platform Deal",
      amount: 500000,
      stage: "Proposal",
      status: "Open",
      probability: 60,
      closeDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ownerId: "user_002",
      createdDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "deal_004",
      name: "Global Systems - Starter",
      amount: 25000,
      stage: "Discovery",
      status: "Open",
      probability: 20,
      closeDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      ownerId: "user_001",
      createdDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "deal_005",
      name: "Stale Corp - No Activity",
      amount: 75000,
      stage: "Discovery",
      status: "Open",
      probability: 10,
      closeDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      ownerId: "user_002",
      createdDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  private mockUsers: GongUser[] = [
    {
      id: "user_001",
      emailAddress: "sarah@company.com",
      firstName: "Sarah",
      lastName: "Chen",
      title: "Account Executive",
      isActive: true,
    },
    {
      id: "user_002",
      emailAddress: "mike@company.com",
      firstName: "Mike",
      lastName: "Johnson",
      title: "Senior AE",
      isActive: true,
    },
  ];

  constructor() {
    super("mock-key", "mock-secret", "http://localhost:3002");
  }

  async getCalls(filters?: CallFilters): Promise<GongCall[]> {
    let calls = [...this.mockCalls];

    if (filters?.fromDateTime) {
      const from = new Date(filters.fromDateTime).getTime();
      calls = calls.filter(
        (c) => c.started && new Date(c.started).getTime() >= from
      );
    }
    if (filters?.toDateTime) {
      const to = new Date(filters.toDateTime).getTime();
      calls = calls.filter(
        (c) => c.started && new Date(c.started).getTime() <= to
      );
    }
    if (filters?.primaryUserIds) {
      calls = calls.filter(
        (c) => c.primaryUserId && filters.primaryUserIds!.includes(c.primaryUserId)
      );
    }

    return calls;
  }

  async getCall(callId: string): Promise<GongCall> {
    const call = this.mockCalls.find((c) => c.id === callId);
    if (!call) {
      throw new Error(`Call not found: ${callId}`);
    }
    return call;
  }

  async getDeals(filters?: DealFilters): Promise<GongDeal[]> {
    let deals = [...this.mockDeals];

    if (filters?.status) {
      deals = deals.filter((d) => d.status && filters.status!.includes(d.status));
    }
    if (filters?.ownerId) {
      deals = deals.filter((d) => d.ownerId === filters.ownerId);
    }

    return deals;
  }

  async getDeal(dealId: string): Promise<GongDeal> {
    const deal = this.mockDeals.find((d) => d.id === dealId);
    if (!deal) {
      throw new Error(`Deal not found: ${dealId}`);
    }
    return deal;
  }

  async getUsers(): Promise<GongUser[]> {
    return this.mockUsers;
  }

  async getUser(userId: string): Promise<GongUser> {
    const user = this.mockUsers.find((u) => u.id === userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    return user;
  }
}
