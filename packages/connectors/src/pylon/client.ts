import type {
  PylonIssue,
  PylonAccount,
  PylonContact,
  PaginatedResponse,
  IssueFilters,
  IssueState,
} from "./types.js";

export class PylonClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(
    apiKey: string,
    baseUrl: string = "https://api.usepylon.com"
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Pylon API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json() as Promise<T>;
  }

  // ==================== Issues ====================

  async getIssues(filters?: IssueFilters): Promise<PylonIssue[]> {
    // Pylon requires a 30-day max window for GET /issues
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const params = new URLSearchParams({
      start_time: filters?.created_at?.start || thirtyDaysAgo.toISOString(),
      end_time: filters?.created_at?.end || now.toISOString(),
    });

    const response = await this.request<PaginatedResponse<PylonIssue>>(
      `/issues?${params}`
    );

    let issues = response.data || [];

    // Apply client-side filters since GET /issues has limited filtering
    if (filters?.state && filters.state.length > 0) {
      issues = issues.filter((i) => filters.state!.includes(i.state));
    }
    if (filters?.priority && filters.priority.length > 0) {
      issues = issues.filter(
        (i) => i.priority && filters.priority!.includes(i.priority)
      );
    }
    if (filters?.assignee_id) {
      issues = issues.filter((i) => i.assignee_id === filters.assignee_id);
    }
    if (filters?.account_id) {
      issues = issues.filter((i) => i.account_id === filters.account_id);
    }
    if (filters?.tags && filters.tags.length > 0) {
      issues = issues.filter(
        (i) => i.tags && filters.tags!.some((tag) => i.tags!.includes(tag))
      );
    }

    return issues;
  }

  async searchIssues(
    filters: { field: string; operator: string; value: unknown }[],
    limit: number = 100
  ): Promise<PylonIssue[]> {
    const response = await this.request<PaginatedResponse<PylonIssue>>(
      "/issues/search",
      {
        method: "POST",
        body: JSON.stringify({
          filters,
          limit,
        }),
      }
    );

    return response.data || [];
  }

  async getIssue(issueId: string): Promise<PylonIssue> {
    return this.request<PylonIssue>(`/issues/${issueId}`);
  }

  async getOpenIssues(): Promise<PylonIssue[]> {
    // Get issues that are not closed
    const openStates: IssueState[] = [
      "new",
      "waiting_on_you",
      "waiting_on_customer",
      "on_hold",
    ];
    return this.getIssues({ state: openStates });
  }

  async getUrgentIssues(): Promise<PylonIssue[]> {
    const issues = await this.getOpenIssues();
    return issues.filter(
      (i) => i.priority === "urgent" || i.priority === "high"
    );
  }

  async getIssuesWaitingOnTeam(): Promise<PylonIssue[]> {
    // Issues waiting for your team to respond
    return this.getIssues({ state: ["waiting_on_you", "new"] });
  }

  // ==================== Accounts ====================

  async getAccounts(limit: number = 100): Promise<PylonAccount[]> {
    const response = await this.request<PaginatedResponse<PylonAccount>>(
      `/accounts?limit=${limit}`
    );
    return response.data || [];
  }

  async getAccount(accountId: string): Promise<PylonAccount> {
    return this.request<PylonAccount>(`/accounts/${accountId}`);
  }

  async searchAccounts(
    filters: { field: string; operator: string; value: unknown }[]
  ): Promise<PylonAccount[]> {
    const response = await this.request<PaginatedResponse<PylonAccount>>(
      "/accounts/search",
      {
        method: "POST",
        body: JSON.stringify({ filters }),
      }
    );
    return response.data || [];
  }

  async getAccountIssues(accountId: string): Promise<PylonIssue[]> {
    return this.getIssues({ account_id: accountId });
  }

  // ==================== Contacts ====================

  async getContacts(limit: number = 100): Promise<PylonContact[]> {
    const response = await this.request<PaginatedResponse<PylonContact>>(
      `/contacts?limit=${limit}`
    );
    return response.data || [];
  }

  async getContact(contactId: string): Promise<PylonContact> {
    return this.request<PylonContact>(`/contacts/${contactId}?limit=1`);
  }

  // ==================== Computed Metrics ====================

  async getMetrics(): Promise<{
    total_open: number;
    waiting_on_team: number;
    waiting_on_customer: number;
    on_hold: number;
    urgent_count: number;
    high_priority_count: number;
  }> {
    const issues = await this.getOpenIssues();

    return {
      total_open: issues.length,
      waiting_on_team: issues.filter(
        (i) => i.state === "waiting_on_you" || i.state === "new"
      ).length,
      waiting_on_customer: issues.filter(
        (i) => i.state === "waiting_on_customer"
      ).length,
      on_hold: issues.filter((i) => i.state === "on_hold").length,
      urgent_count: issues.filter((i) => i.priority === "urgent").length,
      high_priority_count: issues.filter((i) => i.priority === "high").length,
    };
  }
}

// Mock client for development/testing without API access
export class MockPylonClient extends PylonClient {
  private mockIssues: PylonIssue[] = [
    {
      id: "iss_001",
      title: "Unable to access dashboard",
      body_text: "Customer reports 500 error when loading main dashboard",
      state: "new",
      priority: "urgent",
      account_id: "acc_001",
      account: { id: "acc_001", name: "Acme Corporation" },
      requester: { id: "con_001", name: "John Smith", email: "john@acme.com" },
      assignee: { id: "usr_001", name: "Sarah Chen", email: "sarah@company.com" },
      tags: ["bug", "dashboard", "enterprise"],
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      channel: "slack",
    },
    {
      id: "iss_002",
      title: "Billing discrepancy on invoice",
      body_text: "Customer was charged twice for monthly subscription",
      state: "waiting_on_you",
      priority: "high",
      account_id: "acc_002",
      account: { id: "acc_002", name: "TechStart Inc" },
      requester: { id: "con_002", name: "Jane Doe", email: "jane@techstart.io" },
      tags: ["billing", "urgent"],
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      channel: "email",
    },
    {
      id: "iss_003",
      title: "Feature request: Export to PDF",
      body_text: "Would like ability to export reports to PDF format",
      state: "waiting_on_customer",
      priority: "low",
      account_id: "acc_003",
      account: { id: "acc_003", name: "Global Systems LLC" },
      requester: { id: "con_003", name: "Bob Wilson", email: "bob@globalsys.com" },
      assignee: { id: "usr_002", name: "Mike Johnson", email: "mike@company.com" },
      tags: ["feature-request", "reports"],
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      channel: "web",
    },
    {
      id: "iss_004",
      title: "Integration with Salesforce broken",
      body_text: "Salesforce sync stopped working after their latest update",
      state: "new",
      priority: "urgent",
      account_id: "acc_004",
      account: { id: "acc_004", name: "Enterprise Co" },
      requester: { id: "con_004", name: "Alice Brown", email: "alice@enterprise.com" },
      tags: ["integration", "salesforce", "enterprise"],
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      channel: "slack",
    },
    {
      id: "iss_005",
      title: "Data not syncing correctly",
      body_text: "Some records are missing after sync operation",
      state: "waiting_on_you",
      priority: "high",
      account_id: "acc_001",
      account: { id: "acc_001", name: "Acme Corporation" },
      requester: { id: "con_005", name: "Tom Davis", email: "tom@acme.com" },
      tags: ["bug", "sync", "data"],
      created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      channel: "email",
    },
    {
      id: "iss_006",
      title: "Performance issues on large datasets",
      body_text: "Dashboard takes 30+ seconds to load with 10k+ records",
      state: "on_hold",
      priority: "normal",
      account_id: "acc_004",
      account: { id: "acc_004", name: "Enterprise Co" },
      requester: { id: "con_004", name: "Alice Brown", email: "alice@enterprise.com" },
      tags: ["performance", "enterprise"],
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      channel: "email",
    },
  ];

  private mockAccounts: PylonAccount[] = [
    {
      id: "acc_001",
      name: "Acme Corporation",
      domains: ["acme.com"],
      primary_domain: "acme.com",
      tags: ["enterprise", "priority"],
    },
    {
      id: "acc_002",
      name: "TechStart Inc",
      domains: ["techstart.io"],
      primary_domain: "techstart.io",
      tags: ["growth"],
    },
    {
      id: "acc_003",
      name: "Global Systems LLC",
      domains: ["globalsys.com"],
      primary_domain: "globalsys.com",
      tags: ["starter"],
    },
    {
      id: "acc_004",
      name: "Enterprise Co",
      domains: ["enterprise.com"],
      primary_domain: "enterprise.com",
      tags: ["enterprise", "priority"],
    },
  ];

  constructor() {
    super("mock-api-key", "http://localhost:3001");
  }

  async getIssues(filters?: IssueFilters): Promise<PylonIssue[]> {
    let issues = [...this.mockIssues];

    if (filters?.state && filters.state.length > 0) {
      issues = issues.filter((i) => filters.state!.includes(i.state));
    }
    if (filters?.priority && filters.priority.length > 0) {
      issues = issues.filter(
        (i) => i.priority && filters.priority!.includes(i.priority)
      );
    }
    if (filters?.account_id) {
      issues = issues.filter((i) => i.account_id === filters.account_id);
    }
    if (filters?.tags && filters.tags.length > 0) {
      issues = issues.filter(
        (i) => i.tags && filters.tags!.some((tag) => i.tags!.includes(tag))
      );
    }

    return issues;
  }

  async searchIssues(
    filters: { field: string; operator: string; value: unknown }[]
  ): Promise<PylonIssue[]> {
    let issues = [...this.mockIssues];

    for (const filter of filters) {
      if (filter.field === "title" && filter.operator === "string_contains") {
        const searchValue = String(filter.value).toLowerCase();
        issues = issues.filter((i) =>
          i.title.toLowerCase().includes(searchValue)
        );
      }
      if (filter.field === "body_text" && filter.operator === "string_contains") {
        const searchValue = String(filter.value).toLowerCase();
        issues = issues.filter(
          (i) => i.body_text && i.body_text.toLowerCase().includes(searchValue)
        );
      }
      if (filter.field === "state" && filter.operator === "in") {
        const states = filter.value as string[];
        issues = issues.filter((i) => states.includes(i.state));
      }
    }

    return issues;
  }

  async getIssue(issueId: string): Promise<PylonIssue> {
    const issue = this.mockIssues.find((i) => i.id === issueId);
    if (!issue) {
      throw new Error(`Issue not found: ${issueId}`);
    }
    return issue;
  }

  async getAccounts(): Promise<PylonAccount[]> {
    return this.mockAccounts;
  }

  async getAccount(accountId: string): Promise<PylonAccount> {
    const account = this.mockAccounts.find((a) => a.id === accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }
    return account;
  }

  async searchAccounts(
    filters: { field: string; operator: string; value: unknown }[]
  ): Promise<PylonAccount[]> {
    let accounts = [...this.mockAccounts];

    for (const filter of filters) {
      if (filter.field === "name" && filter.operator === "string_contains") {
        const searchValue = String(filter.value).toLowerCase();
        accounts = accounts.filter((a) =>
          a.name.toLowerCase().includes(searchValue)
        );
      }
    }

    return accounts;
  }

  async getContacts(): Promise<PylonContact[]> {
    // Extract unique contacts from issues
    const contactMap = new Map<string, PylonContact>();
    for (const issue of this.mockIssues) {
      if (issue.requester) {
        contactMap.set(issue.requester.id, {
          ...issue.requester,
          account_id: issue.account_id,
          account: issue.account,
        });
      }
    }
    return Array.from(contactMap.values());
  }

  async getContact(contactId: string): Promise<PylonContact> {
    const contacts = await this.getContacts();
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) {
      throw new Error(`Contact not found: ${contactId}`);
    }
    return contact;
  }
}
