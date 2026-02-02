import type {
  PostHogEvent,
  PostHogPerson,
  PostHogInsight,
  PostHogFeatureFlag,
  PostHogCohort,
  PostHogEventDefinition,
  EventsResponse,
  PersonsResponse,
  HogQLResponse,
  ActiveUser,
  EventCount,
  EventFilters,
  PersonFilters,
} from "./types.js";

export class PostHogClient {
  private apiKey: string;
  private projectId: string;
  private baseUrl: string;

  constructor(
    apiKey: string,
    projectId: string,
    baseUrl: string = "https://app.posthog.com"
  ) {
    this.apiKey = apiKey;
    this.projectId = projectId;
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
        `PostHog API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json() as Promise<T>;
  }

  // ==================== Events ====================

  async getEvents(filters?: EventFilters): Promise<PostHogEvent[]> {
    const params = new URLSearchParams();

    if (filters?.event) params.append("event", filters.event);
    if (filters?.distinct_id) params.append("distinct_id", filters.distinct_id);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.after) params.append("after", filters.after);
    if (filters?.before) params.append("before", filters.before);

    const response = await this.request<EventsResponse>(
      `/api/projects/${this.projectId}/events/?${params}`
    );

    return response.results || [];
  }

  async getRecentEvents(
    limit: number = 100,
    eventType?: string
  ): Promise<PostHogEvent[]> {
    return this.getEvents({ limit, event: eventType });
  }

  async getEventDefinitions(): Promise<PostHogEventDefinition[]> {
    const response = await this.request<{ results: PostHogEventDefinition[] }>(
      `/api/projects/${this.projectId}/event_definitions/`
    );

    return response.results || [];
  }

  // ==================== Persons (Users) ====================

  async getPersons(filters?: PersonFilters): Promise<PostHogPerson[]> {
    const params = new URLSearchParams();

    if (filters?.search) params.append("search", filters.search);
    if (filters?.distinct_id) params.append("distinct_id", filters.distinct_id);
    if (filters?.limit) params.append("limit", filters.limit.toString());

    const response = await this.request<PersonsResponse>(
      `/api/projects/${this.projectId}/persons/?${params}`
    );

    return response.results || [];
  }

  async getPersonByDistinctId(distinctId: string): Promise<PostHogPerson | null> {
    try {
      const persons = await this.getPersons({ distinct_id: distinctId, limit: 1 });
      return persons[0] || null;
    } catch {
      return null;
    }
  }

  async searchPersons(
    searchTerm: string,
    limit: number = 20
  ): Promise<PostHogPerson[]> {
    return this.getPersons({ search: searchTerm, limit });
  }

  // ==================== HogQL ====================

  async queryHogQL(query: string): Promise<HogQLResponse> {
    const response = await this.request<HogQLResponse>(
      `/api/projects/${this.projectId}/query/`,
      {
        method: "POST",
        body: JSON.stringify({
          query: {
            kind: "HogQLQuery",
            query: query,
          },
        }),
      }
    );

    return response;
  }

  // ==================== Analytics ====================

  async getActiveUsers(days: number = 30): Promise<{
    total: number;
    users: ActiveUser[];
  }> {
    const query = `
      SELECT
        distinct_id,
        count() as event_count,
        max(timestamp) as last_seen
      FROM events
      WHERE timestamp > now() - INTERVAL ${days} DAY
      GROUP BY distinct_id
      ORDER BY event_count DESC
      LIMIT 100
    `;

    try {
      const result = await this.queryHogQL(query);
      const users = (result.results || []).map((row) => ({
        distinct_id: row[0] as string,
        event_count: row[1] as number,
        last_seen: row[2] as string,
      }));

      return { total: users.length, users };
    } catch (error) {
      console.error("HogQL query failed, falling back to events API:", error);
      // Fallback to events API
      const after = new Date();
      after.setDate(after.getDate() - days);

      const events = await this.getEvents({
        limit: 1000,
        after: after.toISOString(),
      });

      const userMap = new Map<string, { event_count: number; last_seen: string }>();

      for (const event of events) {
        const existing = userMap.get(event.distinct_id);
        if (existing) {
          existing.event_count++;
          if (event.timestamp > existing.last_seen) {
            existing.last_seen = event.timestamp;
          }
        } else {
          userMap.set(event.distinct_id, {
            event_count: 1,
            last_seen: event.timestamp,
          });
        }
      }

      const users = Array.from(userMap.entries())
        .map(([distinct_id, data]) => ({ distinct_id, ...data }))
        .sort((a, b) => b.event_count - a.event_count);

      return { total: users.length, users };
    }
  }

  async getEventCounts(days: number = 30): Promise<EventCount[]> {
    const query = `
      SELECT
        event,
        count() as count
      FROM events
      WHERE timestamp > now() - INTERVAL ${days} DAY
      GROUP BY event
      ORDER BY count DESC
    `;

    try {
      const result = await this.queryHogQL(query);
      return (result.results || []).map((row) => ({
        event: row[0] as string,
        count: row[1] as number,
      }));
    } catch (error) {
      console.error("HogQL query failed, falling back to events API:", error);
      // Fallback
      const after = new Date();
      after.setDate(after.getDate() - days);

      const events = await this.getEvents({
        limit: 1000,
        after: after.toISOString(),
      });

      const countMap = new Map<string, number>();

      for (const event of events) {
        countMap.set(event.event, (countMap.get(event.event) || 0) + 1);
      }

      return Array.from(countMap.entries())
        .map(([event, count]) => ({ event, count }))
        .sort((a, b) => b.count - a.count);
    }
  }

  async getUserActivity(
    distinctId: string,
    limit: number = 50
  ): Promise<PostHogEvent[]> {
    return this.getEvents({ distinct_id: distinctId, limit });
  }

  // ==================== Feature Flags ====================

  async getFeatureFlags(): Promise<PostHogFeatureFlag[]> {
    try {
      const response = await this.request<{ results: PostHogFeatureFlag[] }>(
        `/api/projects/${this.projectId}/feature_flags/`
      );

      return (response.results || []).map((flag) => ({
        id: flag.id,
        key: flag.key,
        name: flag.name,
        active: flag.active,
        filters: flag.filters,
        created_at: flag.created_at,
      }));
    } catch {
      return [];
    }
  }

  // ==================== Cohorts ====================

  async getCohorts(): Promise<PostHogCohort[]> {
    try {
      const response = await this.request<{ results: PostHogCohort[] }>(
        `/api/projects/${this.projectId}/cohorts/`
      );

      return (response.results || []).map((cohort) => ({
        id: cohort.id,
        name: cohort.name,
        description: cohort.description,
        count: cohort.count,
        created_at: cohort.created_at,
      }));
    } catch {
      return [];
    }
  }

  // ==================== Insights ====================

  async getInsights(limit: number = 20): Promise<PostHogInsight[]> {
    try {
      const response = await this.request<{ results: PostHogInsight[] }>(
        `/api/projects/${this.projectId}/insights/?limit=${limit}`
      );

      return (response.results || []).map((insight) => ({
        id: insight.id,
        name: insight.name,
        description: insight.description,
        result: insight.result,
      }));
    } catch {
      return [];
    }
  }
}

// Mock client for development/testing without API access
export class MockPostHogClient extends PostHogClient {
  private mockEvents: PostHogEvent[] = [
    {
      id: "evt_001",
      distinct_id: "user_001",
      event: "$pageview",
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      properties: { $current_url: "/dashboard", $browser: "Chrome" },
    },
    {
      id: "evt_002",
      distinct_id: "user_001",
      event: "button_click",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      properties: { button_name: "submit", page: "/checkout" },
    },
    {
      id: "evt_003",
      distinct_id: "user_002",
      event: "$pageview",
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      properties: { $current_url: "/pricing", $browser: "Firefox" },
    },
    {
      id: "evt_004",
      distinct_id: "user_002",
      event: "signup",
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      properties: { plan: "pro", source: "organic" },
    },
    {
      id: "evt_005",
      distinct_id: "user_003",
      event: "$pageview",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      properties: { $current_url: "/features", $browser: "Safari" },
    },
  ];

  private mockPersons: PostHogPerson[] = [
    {
      id: "person_001",
      distinct_ids: ["user_001"],
      properties: { email: "alice@example.com", name: "Alice Smith", plan: "pro" },
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "person_002",
      distinct_ids: ["user_002"],
      properties: { email: "bob@example.com", name: "Bob Johnson", plan: "starter" },
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "person_003",
      distinct_ids: ["user_003"],
      properties: { email: "carol@example.com", name: "Carol Williams" },
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  private mockFeatureFlags: PostHogFeatureFlag[] = [
    { id: 1, key: "new-dashboard", name: "New Dashboard", active: true },
    { id: 2, key: "dark-mode", name: "Dark Mode", active: true },
    { id: 3, key: "beta-features", name: "Beta Features", active: false },
  ];

  private mockCohorts: PostHogCohort[] = [
    { id: 1, name: "Pro Users", count: 150 },
    { id: 2, name: "Active Last 7 Days", count: 523 },
    { id: 3, name: "Churned Users", count: 42 },
  ];

  constructor() {
    super("mock-key", "mock-project", "http://localhost:3002");
  }

  async getEvents(filters?: EventFilters): Promise<PostHogEvent[]> {
    let events = [...this.mockEvents];

    if (filters?.event) {
      events = events.filter((e) => e.event === filters.event);
    }
    if (filters?.distinct_id) {
      events = events.filter((e) => e.distinct_id === filters.distinct_id);
    }
    if (filters?.limit) {
      events = events.slice(0, filters.limit);
    }

    return events;
  }

  async getEventDefinitions(): Promise<PostHogEventDefinition[]> {
    return [
      { name: "$pageview", volume_30_day: 15420 },
      { name: "button_click", volume_30_day: 8234 },
      { name: "signup", volume_30_day: 523 },
      { name: "purchase", volume_30_day: 187 },
      { name: "$identify", volume_30_day: 2341 },
    ];
  }

  async getPersons(filters?: PersonFilters): Promise<PostHogPerson[]> {
    let persons = [...this.mockPersons];

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      persons = persons.filter(
        (p) =>
          (p.properties.email as string)?.toLowerCase().includes(search) ||
          (p.properties.name as string)?.toLowerCase().includes(search)
      );
    }
    if (filters?.distinct_id) {
      persons = persons.filter((p) =>
        p.distinct_ids.includes(filters.distinct_id!)
      );
    }
    if (filters?.limit) {
      persons = persons.slice(0, filters.limit);
    }

    return persons;
  }

  async queryHogQL(_query: string): Promise<HogQLResponse> {
    // Return mock data for common queries
    return {
      columns: ["distinct_id", "event_count", "last_seen"],
      results: [
        ["user_001", 45, new Date().toISOString()],
        ["user_002", 32, new Date().toISOString()],
        ["user_003", 12, new Date().toISOString()],
      ],
    };
  }

  async getActiveUsers(_days: number = 30): Promise<{
    total: number;
    users: ActiveUser[];
  }> {
    return {
      total: 3,
      users: [
        {
          distinct_id: "user_001",
          event_count: 45,
          last_seen: new Date().toISOString(),
        },
        {
          distinct_id: "user_002",
          event_count: 32,
          last_seen: new Date().toISOString(),
        },
        {
          distinct_id: "user_003",
          event_count: 12,
          last_seen: new Date().toISOString(),
        },
      ],
    };
  }

  async getEventCounts(_days: number = 30): Promise<EventCount[]> {
    return [
      { event: "$pageview", count: 15420 },
      { event: "button_click", count: 8234 },
      { event: "signup", count: 523 },
      { event: "purchase", count: 187 },
    ];
  }

  async getFeatureFlags(): Promise<PostHogFeatureFlag[]> {
    return this.mockFeatureFlags;
  }

  async getCohorts(): Promise<PostHogCohort[]> {
    return this.mockCohorts;
  }

  async getInsights(_limit: number = 20): Promise<PostHogInsight[]> {
    return [
      { id: 1, name: "Daily Active Users", description: "DAU over time" },
      { id: 2, name: "Signup Funnel", description: "Conversion funnel" },
      { id: 3, name: "Feature Usage", description: "Feature adoption metrics" },
    ];
  }
}
