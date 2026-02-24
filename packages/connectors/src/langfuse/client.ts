import type {
  LangfuseTrace,
  LangfuseObservation,
  LangfuseScore,
  LangfuseSession,
  LangfusePrompt,
  TracesResponse,
  ObservationsResponse,
  ScoresResponse,
  SessionsResponse,
  PromptsResponse,
  TraceFilters,
  ObservationFilters,
  ScoreFilters,
  MetricsQuery,
  MetricsResponse,
  TraceSummary,
  ObservationSummary,
  ScoreSummary,
} from "./types.js";

export class LangfuseClient {
  private publicKey: string;
  private secretKey: string;
  private baseUrl: string;

  constructor(
    publicKey: string,
    secretKey: string,
    baseUrl: string = "https://cloud.langfuse.com"
  ) {
    this.publicKey = publicKey;
    this.secretKey = secretKey;
    this.baseUrl = baseUrl;
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(
      `${this.publicKey}:${this.secretKey}`
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
      const errorText = await response.text();
      const err = new Error(
        `Langfuse API error: ${response.status} ${response.statusText} - ${errorText}`
      );
      (err as Error & { status: number }).status = response.status;
      throw err;
    }

    return response.json() as Promise<T>;
  }

  // ==================== Traces ====================

  async getTraces(filters?: TraceFilters): Promise<LangfuseTrace[]> {
    const params = new URLSearchParams();

    if (filters?.name) params.append("name", filters.name);
    if (filters?.userId) params.append("userId", filters.userId);
    if (filters?.sessionId) params.append("sessionId", filters.sessionId);
    if (filters?.tags) {
      filters.tags.forEach((tag) => params.append("tags", tag));
    }
    if (filters?.fromTimestamp)
      params.append("fromTimestamp", filters.fromTimestamp);
    if (filters?.toTimestamp) params.append("toTimestamp", filters.toTimestamp);
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());

    const response = await this.request<TracesResponse>(
      `/api/public/traces?${params}`
    );

    return response.data || [];
  }

  async getRecentTraces(
    limit: number = 50,
    daysBack: number = 7
  ): Promise<LangfuseTrace[]> {
    const fromTimestamp = new Date(
      Date.now() - daysBack * 24 * 60 * 60 * 1000
    ).toISOString();

    return this.getTraces({ limit, fromTimestamp });
  }

  async getTrace(traceId: string): Promise<LangfuseTrace> {
    return this.request<LangfuseTrace>(`/api/public/traces/${traceId}`);
  }

  async searchTraces(
    query: string,
    daysBack: number = 30,
    limit: number = 50
  ): Promise<LangfuseTrace[]> {
    const fromTimestamp = new Date(
      Date.now() - daysBack * 24 * 60 * 60 * 1000
    ).toISOString();

    // Search by name first
    const nameMatches = await this.getTraces({
      name: query,
      fromTimestamp,
      limit,
    });

    // Also search by userId
    const userMatches = await this.getTraces({
      userId: query,
      fromTimestamp,
      limit,
    });

    // Deduplicate results
    const resultMap = new Map<string, LangfuseTrace>();
    for (const trace of [...nameMatches, ...userMatches]) {
      resultMap.set(trace.id, trace);
    }

    return Array.from(resultMap.values()).slice(0, limit);
  }

  // ==================== Observations ====================

  async getObservations(filters?: ObservationFilters): Promise<LangfuseObservation[]> {
    const params = new URLSearchParams();

    if (filters?.traceId) params.append("traceId", filters.traceId);
    if (filters?.name) params.append("name", filters.name);
    if (filters?.type) params.append("type", filters.type);
    if (filters?.userId) params.append("userId", filters.userId);
    if (filters?.fromStartTime)
      params.append("fromStartTime", filters.fromStartTime);
    if (filters?.toStartTime) params.append("toStartTime", filters.toStartTime);
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());

    const response = await this.request<ObservationsResponse>(
      `/api/public/observations?${params}`
    );

    return response.data || [];
  }

  async getObservation(observationId: string): Promise<LangfuseObservation> {
    return this.request<LangfuseObservation>(
      `/api/public/observations/${observationId}`
    );
  }

  async getTraceObservations(traceId: string): Promise<LangfuseObservation[]> {
    return this.getObservations({ traceId, limit: 100 });
  }

  async getGenerations(
    limit: number = 50,
    daysBack: number = 7
  ): Promise<LangfuseObservation[]> {
    const fromStartTime = new Date(
      Date.now() - daysBack * 24 * 60 * 60 * 1000
    ).toISOString();

    return this.getObservations({ type: "GENERATION", fromStartTime, limit });
  }

  // ==================== Scores ====================

  async getScores(filters?: ScoreFilters): Promise<LangfuseScore[]> {
    const params = new URLSearchParams();

    if (filters?.name) params.append("name", filters.name);
    if (filters?.source) params.append("source", filters.source);
    if (filters?.dataType) params.append("dataType", filters.dataType);
    if (filters?.fromTimestamp)
      params.append("fromTimestamp", filters.fromTimestamp);
    if (filters?.toTimestamp) params.append("toTimestamp", filters.toTimestamp);
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());

    const response = await this.request<ScoresResponse>(
      `/api/public/scores?${params}`
    );

    return response.data || [];
  }

  async getTraceScores(traceId: string): Promise<LangfuseScore[]> {
    const trace = await this.getTrace(traceId);
    return trace.scores || [];
  }

  async getRecentScores(
    limit: number = 50,
    daysBack: number = 7
  ): Promise<LangfuseScore[]> {
    const fromTimestamp = new Date(
      Date.now() - daysBack * 24 * 60 * 60 * 1000
    ).toISOString();

    return this.getScores({ limit, fromTimestamp });
  }

  // ==================== Sessions ====================

  async getSessions(
    page: number = 1,
    limit: number = 50
  ): Promise<LangfuseSession[]> {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", limit.toString());

    const response = await this.request<SessionsResponse>(
      `/api/public/sessions?${params}`
    );

    return response.data || [];
  }

  async getSession(sessionId: string): Promise<LangfuseSession> {
    return this.request<LangfuseSession>(`/api/public/sessions/${sessionId}`);
  }

  // ==================== Prompts ====================

  async getPrompts(
    page: number = 1,
    limit: number = 50
  ): Promise<LangfusePrompt[]> {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", limit.toString());

    const response = await this.request<PromptsResponse>(
      `/api/public/v2/prompts?${params}`
    );

    return response.data || [];
  }

  async getPrompt(
    name: string,
    version?: number,
    label?: string
  ): Promise<LangfusePrompt> {
    const params = new URLSearchParams();
    if (version !== undefined) params.append("version", version.toString());
    if (label) params.append("label", label);

    return this.request<LangfusePrompt>(
      `/api/public/v2/prompts/${encodeURIComponent(name)}?${params}`
    );
  }

  // ==================== Metrics ====================

  async getMetrics(query: MetricsQuery): Promise<MetricsResponse> {
    return this.request<MetricsResponse>("/api/public/metrics", {
      method: "POST",
      body: JSON.stringify(query),
    });
  }

  async getTraceSummary(daysBack: number = 7): Promise<{
    total_traces: number;
    total_cost: number;
    total_tokens: number;
    avg_latency_ms: number;
    error_count: number;
  }> {
    const traces = await this.getRecentTraces(100, daysBack);

    const errorCount = traces.filter((t) => t.level === "ERROR").length;
    const totalCost = traces.reduce((sum, t) => sum + (t.totalCost || 0), 0);
    const totalTokens = traces.reduce((sum, t) => sum + (t.totalTokens || 0), 0);
    const avgLatency =
      traces.length > 0
        ? traces.reduce((sum, t) => sum + (t.latency || 0), 0) / traces.length
        : 0;

    return {
      total_traces: traces.length,
      total_cost: Math.round(totalCost * 10000) / 10000,
      total_tokens: totalTokens,
      avg_latency_ms: Math.round(avgLatency),
      error_count: errorCount,
    };
  }

  async getModelUsage(daysBack: number = 7): Promise<
    Array<{
      model: string;
      count: number;
      total_tokens: number;
      total_cost: number;
    }>
  > {
    const generations = await this.getGenerations(100, daysBack);

    const modelMap = new Map<
      string,
      { count: number; tokens: number; cost: number }
    >();

    for (const gen of generations) {
      const model = gen.model || "unknown";
      const existing = modelMap.get(model) || { count: 0, tokens: 0, cost: 0 };
      existing.count++;
      existing.tokens += gen.usage?.total || 0;
      existing.cost += gen.calculatedTotalCost || 0;
      modelMap.set(model, existing);
    }

    return Array.from(modelMap.entries())
      .map(([model, data]) => ({
        model,
        count: data.count,
        total_tokens: data.tokens,
        total_cost: Math.round(data.cost * 10000) / 10000,
      }))
      .sort((a, b) => b.count - a.count);
  }

  // ==================== Helpers ====================

  formatTrace(trace: LangfuseTrace): TraceSummary {
    return {
      id: trace.id,
      name: trace.name,
      userId: trace.userId,
      sessionId: trace.sessionId,
      timestamp: trace.timestamp,
      latency_ms: trace.latency ? Math.round(trace.latency * 1000) : undefined,
      total_cost: trace.totalCost,
      total_tokens: trace.totalTokens,
      level: trace.level,
      observation_count: trace.observationCount,
    };
  }

  formatObservation(obs: LangfuseObservation): ObservationSummary {
    return {
      id: obs.id,
      traceId: obs.traceId,
      type: obs.type,
      name: obs.name,
      model: obs.model,
      startTime: obs.startTime,
      latency_ms: obs.latency ? Math.round(obs.latency * 1000) : undefined,
      total_cost: obs.calculatedTotalCost,
      total_tokens: obs.usage?.total,
    };
  }

  formatScore(score: LangfuseScore): ScoreSummary {
    return {
      id: score.id,
      traceId: score.traceId,
      name: score.name,
      value: score.value,
      stringValue: score.stringValue,
      source: score.source,
      dataType: score.dataType,
    };
  }

  // ==================== Users ====================

  async getUsers(daysBack: number = 7, limit: number = 100): Promise<
    Array<{
      userId: string;
      traceCount: number;
      totalCost: number;
      totalTokens: number;
      lastSeen: string;
    }>
  > {
    // Fetch multiple pages to get a more comprehensive user list
    const fromTimestamp = new Date(
      Date.now() - daysBack * 24 * 60 * 60 * 1000
    ).toISOString();

    const userMap = new Map<
      string,
      { count: number; cost: number; tokens: number; lastSeen: string }
    >();

    // Fetch up to 10 pages of 100 traces each to get better coverage
    let page = 1;
    const maxPages = 10;

    while (page <= maxPages) {
      try {
        const traces = await this.getTraces({
          fromTimestamp,
          limit: 100,
          page,
        });

        if (traces.length === 0) break;

        for (const trace of traces) {
          const userId = trace.userId || "anonymous";
          const existing = userMap.get(userId) || {
            count: 0,
            cost: 0,
            tokens: 0,
            lastSeen: trace.timestamp,
          };

          existing.count++;
          existing.cost += trace.totalCost || 0;
          existing.tokens += trace.totalTokens || 0;
          if (trace.timestamp > existing.lastSeen) {
            existing.lastSeen = trace.timestamp;
          }

          userMap.set(userId, existing);
        }

        // If we got fewer than 100, we've reached the end
        if (traces.length < 100) break;
        page++;
      } catch {
        break;
      }
    }

    return Array.from(userMap.entries())
      .map(([userId, data]) => ({
        userId,
        traceCount: data.count,
        totalCost: Math.round(data.cost * 10000) / 10000,
        totalTokens: data.tokens,
        lastSeen: data.lastSeen,
      }))
      .sort((a, b) => b.totalCost - a.totalCost); // Sort by cost to prioritize high-value users
  }

  async getUserTraces(
    userId: string,
    limit: number = 50,
    daysBack: number = 30
  ): Promise<LangfuseTrace[]> {
    const fromTimestamp = new Date(
      Date.now() - daysBack * 24 * 60 * 60 * 1000
    ).toISOString();

    return this.getTraces({ userId, fromTimestamp, limit });
  }

  async getUserStats(userId: string, daysBack: number = 30): Promise<{
    userId: string;
    totalTraces: number;
    totalCost: number;
    totalTokens: number;
    avgLatencyMs: number;
    errorCount: number;
    models: Array<{ model: string; count: number }>;
    firstSeen: string;
    lastSeen: string;
  }> {
    const traces = await this.getUserTraces(userId, 50, daysBack);

    if (traces.length === 0) {
      return {
        userId,
        totalTraces: 0,
        totalCost: 0,
        totalTokens: 0,
        avgLatencyMs: 0,
        errorCount: 0,
        models: [],
        firstSeen: "",
        lastSeen: "",
      };
    }

    // Get observations for model breakdown - fetch in parallel for speed
    // Limit to first 10 traces to avoid timeout
    const modelMap = new Map<string, number>();
    const tracesToFetch = traces.slice(0, 10);

    const observationResults = await Promise.allSettled(
      tracesToFetch.map((trace) => this.getTraceObservations(trace.id))
    );

    for (const result of observationResults) {
      if (result.status === "fulfilled") {
        for (const obs of result.value) {
          if (obs.model) {
            modelMap.set(obs.model, (modelMap.get(obs.model) || 0) + 1);
          }
        }
      }
    }

    const sortedTraces = [...traces].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return {
      userId,
      totalTraces: traces.length,
      totalCost:
        Math.round(traces.reduce((sum, t) => sum + (t.totalCost || 0), 0) * 10000) /
        10000,
      totalTokens: traces.reduce((sum, t) => sum + (t.totalTokens || 0), 0),
      avgLatencyMs: Math.round(
        (traces.reduce((sum, t) => sum + (t.latency || 0), 0) / traces.length) * 1000
      ),
      errorCount: traces.filter((t) => t.level === "ERROR").length,
      models: Array.from(modelMap.entries())
        .map(([model, count]) => ({ model, count }))
        .sort((a, b) => b.count - a.count),
      firstSeen: sortedTraces[0].timestamp,
      lastSeen: sortedTraces[sortedTraces.length - 1].timestamp,
    };
  }
}

// Mock client for development/testing without API access
export class MockLangfuseClient extends LangfuseClient {
  private mockTraces: LangfuseTrace[] = [
    {
      id: "trace_001",
      name: "chat-completion",
      userId: "user_123",
      sessionId: "session_abc",
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      latency: 1.234,
      totalCost: 0.0025,
      totalTokens: 450,
      inputTokens: 100,
      outputTokens: 350,
      level: "DEFAULT",
      observationCount: 3,
      metadata: { environment: "production" },
      tags: ["gpt-4", "chat"],
    },
    {
      id: "trace_002",
      name: "rag-query",
      userId: "user_456",
      sessionId: "session_def",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      latency: 2.567,
      totalCost: 0.0089,
      totalTokens: 1200,
      inputTokens: 800,
      outputTokens: 400,
      level: "DEFAULT",
      observationCount: 5,
      metadata: { environment: "production", retriever: "pinecone" },
      tags: ["gpt-4", "rag"],
    },
    {
      id: "trace_003",
      name: "summarization",
      userId: "user_123",
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      latency: 3.891,
      totalCost: 0.0156,
      totalTokens: 2500,
      inputTokens: 2000,
      outputTokens: 500,
      level: "WARNING",
      observationCount: 2,
      tags: ["claude", "summarize"],
    },
    {
      id: "trace_004",
      name: "chat-completion",
      userId: "user_789",
      sessionId: "session_ghi",
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      latency: 0.892,
      totalCost: 0.0018,
      totalTokens: 320,
      inputTokens: 80,
      outputTokens: 240,
      level: "DEFAULT",
      observationCount: 2,
      tags: ["gpt-3.5-turbo", "chat"],
    },
    {
      id: "trace_005",
      name: "code-generation",
      userId: "user_456",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      latency: 4.123,
      totalCost: 0.0234,
      totalTokens: 3200,
      level: "ERROR",
      observationCount: 4,
      metadata: { error: "Context length exceeded" },
      tags: ["gpt-4", "code"],
    },
  ];

  private mockObservations: LangfuseObservation[] = [
    {
      id: "obs_001",
      traceId: "trace_001",
      type: "GENERATION",
      name: "gpt-4-completion",
      model: "gpt-4",
      startTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 1 * 60 * 60 * 1000 + 1234).toISOString(),
      latency: 1.234,
      usage: { input: 100, output: 350, total: 450 },
      calculatedTotalCost: 0.0025,
      level: "DEFAULT",
    },
    {
      id: "obs_002",
      traceId: "trace_002",
      type: "SPAN",
      name: "retrieval",
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 2 * 60 * 60 * 1000 + 500).toISOString(),
      latency: 0.5,
      metadata: { documents_retrieved: 5 },
    },
    {
      id: "obs_003",
      traceId: "trace_002",
      type: "GENERATION",
      name: "gpt-4-rag-completion",
      model: "gpt-4",
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000 + 500).toISOString(),
      endTime: new Date(Date.now() - 2 * 60 * 60 * 1000 + 2567).toISOString(),
      latency: 2.067,
      usage: { input: 800, output: 400, total: 1200 },
      calculatedTotalCost: 0.0089,
      promptName: "rag-prompt",
      promptVersion: 3,
    },
    {
      id: "obs_004",
      traceId: "trace_003",
      type: "GENERATION",
      name: "claude-summarize",
      model: "claude-3-opus-20240229",
      startTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      latency: 3.891,
      usage: { input: 2000, output: 500, total: 2500 },
      calculatedTotalCost: 0.0156,
    },
    {
      id: "obs_005",
      traceId: "trace_004",
      type: "GENERATION",
      name: "gpt-35-chat",
      model: "gpt-3.5-turbo",
      startTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      latency: 0.892,
      usage: { input: 80, output: 240, total: 320 },
      calculatedTotalCost: 0.0018,
    },
  ];

  private mockScores: LangfuseScore[] = [
    {
      id: "score_001",
      traceId: "trace_001",
      name: "quality",
      value: 0.92,
      source: "EVAL",
      dataType: "NUMERIC",
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "score_002",
      traceId: "trace_001",
      name: "helpful",
      value: 1,
      source: "ANNOTATION",
      dataType: "BOOLEAN",
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      comment: "Very helpful response",
    },
    {
      id: "score_003",
      traceId: "trace_002",
      name: "relevance",
      value: 0.85,
      source: "EVAL",
      dataType: "NUMERIC",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "score_004",
      traceId: "trace_003",
      name: "sentiment",
      stringValue: "positive",
      source: "EVAL",
      dataType: "CATEGORICAL",
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "score_005",
      traceId: "trace_005",
      name: "quality",
      value: 0.23,
      source: "EVAL",
      dataType: "NUMERIC",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      comment: "Failed to complete task",
    },
  ];

  private mockSessions: LangfuseSession[] = [
    {
      id: "session_abc",
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      projectId: "project_001",
      totalCost: 0.0025,
    },
    {
      id: "session_def",
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      projectId: "project_001",
      totalCost: 0.0089,
    },
    {
      id: "session_ghi",
      createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
      projectId: "project_001",
      totalCost: 0.0018,
    },
  ];

  private mockPrompts: LangfusePrompt[] = [
    {
      id: "prompt_001",
      name: "rag-prompt",
      version: 3,
      type: "chat",
      prompt: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "{{question}}" },
      ],
      labels: ["production"],
      tags: ["rag", "qa"],
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "prompt_002",
      name: "summarize-prompt",
      version: 2,
      type: "text",
      prompt: "Summarize the following text:\n\n{{text}}",
      labels: ["production"],
      tags: ["summarization"],
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  constructor() {
    super("mock-pk", "mock-sk", "http://localhost:3000");
  }

  async getTraces(filters?: TraceFilters): Promise<LangfuseTrace[]> {
    let traces = [...this.mockTraces];

    if (filters?.name) {
      traces = traces.filter((t) =>
        t.name?.toLowerCase().includes(filters.name!.toLowerCase())
      );
    }
    if (filters?.userId) {
      traces = traces.filter((t) => t.userId === filters.userId);
    }
    if (filters?.sessionId) {
      traces = traces.filter((t) => t.sessionId === filters.sessionId);
    }
    if (filters?.limit) {
      traces = traces.slice(0, filters.limit);
    }

    return traces;
  }

  async getTrace(traceId: string): Promise<LangfuseTrace> {
    const trace = this.mockTraces.find((t) => t.id === traceId);
    if (!trace) {
      throw new Error(`Trace not found: ${traceId}`);
    }
    return { ...trace, scores: this.mockScores.filter((s) => s.traceId === traceId) };
  }

  async getObservations(filters?: ObservationFilters): Promise<LangfuseObservation[]> {
    let observations = [...this.mockObservations];

    if (filters?.traceId) {
      observations = observations.filter((o) => o.traceId === filters.traceId);
    }
    if (filters?.type) {
      observations = observations.filter((o) => o.type === filters.type);
    }
    if (filters?.name) {
      observations = observations.filter((o) =>
        o.name?.toLowerCase().includes(filters.name!.toLowerCase())
      );
    }
    if (filters?.limit) {
      observations = observations.slice(0, filters.limit);
    }

    return observations;
  }

  async getObservation(observationId: string): Promise<LangfuseObservation> {
    const obs = this.mockObservations.find((o) => o.id === observationId);
    if (!obs) {
      throw new Error(`Observation not found: ${observationId}`);
    }
    return obs;
  }

  async getScores(filters?: ScoreFilters): Promise<LangfuseScore[]> {
    let scores = [...this.mockScores];

    if (filters?.name) {
      scores = scores.filter((s) =>
        s.name.toLowerCase().includes(filters.name!.toLowerCase())
      );
    }
    if (filters?.source) {
      scores = scores.filter((s) => s.source === filters.source);
    }
    if (filters?.dataType) {
      scores = scores.filter((s) => s.dataType === filters.dataType);
    }
    if (filters?.limit) {
      scores = scores.slice(0, filters.limit);
    }

    return scores;
  }

  async getSessions(
    _page: number = 1,
    limit: number = 50
  ): Promise<LangfuseSession[]> {
    return this.mockSessions.slice(0, limit);
  }

  async getSession(sessionId: string): Promise<LangfuseSession> {
    const session = this.mockSessions.find((s) => s.id === sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return {
      ...session,
      traces: this.mockTraces.filter((t) => t.sessionId === sessionId),
    };
  }

  async getPrompts(
    _page: number = 1,
    limit: number = 50
  ): Promise<LangfusePrompt[]> {
    return this.mockPrompts.slice(0, limit);
  }

  async getPrompt(name: string): Promise<LangfusePrompt> {
    const prompt = this.mockPrompts.find((p) => p.name === name);
    if (!prompt) {
      throw new Error(`Prompt not found: ${name}`);
    }
    return prompt;
  }

  async getTraceSummary(_daysBack: number = 7): Promise<{
    total_traces: number;
    total_cost: number;
    total_tokens: number;
    avg_latency_ms: number;
    error_count: number;
  }> {
    const traces = this.mockTraces;
    const errorCount = traces.filter((t) => t.level === "ERROR").length;
    const totalCost = traces.reduce((sum, t) => sum + (t.totalCost || 0), 0);
    const totalTokens = traces.reduce((sum, t) => sum + (t.totalTokens || 0), 0);
    const avgLatency =
      traces.reduce((sum, t) => sum + (t.latency || 0), 0) / traces.length;

    return {
      total_traces: traces.length,
      total_cost: Math.round(totalCost * 10000) / 10000,
      total_tokens: totalTokens,
      avg_latency_ms: Math.round(avgLatency * 1000),
      error_count: errorCount,
    };
  }

  async getModelUsage(_daysBack: number = 7): Promise<
    Array<{
      model: string;
      count: number;
      total_tokens: number;
      total_cost: number;
    }>
  > {
    return [
      { model: "gpt-4", count: 3, total_tokens: 2150, total_cost: 0.0139 },
      { model: "gpt-3.5-turbo", count: 1, total_tokens: 320, total_cost: 0.0018 },
      { model: "claude-3-opus-20240229", count: 1, total_tokens: 2500, total_cost: 0.0156 },
    ];
  }
}
