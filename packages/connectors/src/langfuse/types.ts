// Langfuse API Types

export interface LangfuseTrace {
  id: string;
  name?: string;
  userId?: string;
  sessionId?: string;
  release?: string;
  version?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  input?: unknown;
  output?: unknown;
  timestamp: string;
  updatedAt?: string;
  latency?: number;
  totalCost?: number;
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  level?: "DEBUG" | "DEFAULT" | "WARNING" | "ERROR";
  observationCount?: number;
  scores?: LangfuseScore[];
}

export interface LangfuseObservation {
  id: string;
  traceId: string;
  type: "GENERATION" | "SPAN" | "EVENT";
  name?: string;
  startTime: string;
  endTime?: string;
  completionStartTime?: string;
  model?: string;
  modelParameters?: Record<string, unknown>;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  level?: "DEBUG" | "DEFAULT" | "WARNING" | "ERROR";
  statusMessage?: string;
  parentObservationId?: string;
  version?: string;
  promptId?: string;
  promptName?: string;
  promptVersion?: number;
  usage?: LangfuseUsage;
  calculatedTotalCost?: number;
  calculatedInputCost?: number;
  calculatedOutputCost?: number;
  latency?: number;
  timeToFirstToken?: number;
}

export interface LangfuseUsage {
  input?: number;
  output?: number;
  total?: number;
  unit?: "TOKENS" | "CHARACTERS" | "MILLISECONDS" | "SECONDS" | "IMAGES";
  inputCost?: number;
  outputCost?: number;
  totalCost?: number;
}

export interface LangfuseScore {
  id: string;
  traceId: string;
  observationId?: string;
  name: string;
  value?: number;
  stringValue?: string;
  source: "API" | "EVAL" | "ANNOTATION";
  comment?: string;
  dataType: "NUMERIC" | "CATEGORICAL" | "BOOLEAN";
  timestamp: string;
  configId?: string;
}

export interface LangfuseSession {
  id: string;
  createdAt: string;
  projectId: string;
  totalCost?: number;
  traces?: LangfuseTrace[];
}

export interface LangfusePrompt {
  id: string;
  name: string;
  version: number;
  type: "text" | "chat";
  prompt: string | LangfuseChatMessage[];
  config?: Record<string, unknown>;
  labels?: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LangfuseChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page?: number;
    limit?: number;
    totalItems?: number;
    totalPages?: number;
    cursor?: string;
  };
}

export interface TracesResponse {
  data: LangfuseTrace[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ObservationsResponse {
  data: LangfuseObservation[];
  meta: {
    page?: number;
    limit?: number;
    totalItems?: number;
    totalPages?: number;
    cursor?: string;
  };
}

export interface ScoresResponse {
  data: LangfuseScore[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface SessionsResponse {
  data: LangfuseSession[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface PromptsResponse {
  data: LangfusePrompt[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

// Filter Types
export interface TraceFilters {
  name?: string;
  userId?: string;
  sessionId?: string;
  tags?: string[];
  fromTimestamp?: string;
  toTimestamp?: string;
  page?: number;
  limit?: number;
}

export interface ObservationFilters {
  traceId?: string;
  name?: string;
  type?: "GENERATION" | "SPAN" | "EVENT";
  userId?: string;
  fromStartTime?: string;
  toStartTime?: string;
  page?: number;
  limit?: number;
}

export interface ScoreFilters {
  name?: string;
  source?: "API" | "EVAL" | "ANNOTATION";
  dataType?: "NUMERIC" | "CATEGORICAL" | "BOOLEAN";
  fromTimestamp?: string;
  toTimestamp?: string;
  page?: number;
  limit?: number;
}

// Metrics Types
export interface MetricsQuery {
  view: "traces" | "observations" | "scores-numeric" | "scores-categorical";
  dimensions?: string[];
  metrics: string[];
  filters?: MetricsFilter[];
  fromTimestamp: string;
  toTimestamp: string;
  timeDimension?: {
    granularity: "hour" | "day" | "week" | "month" | "auto";
  };
  orderBy?: Array<{ field: string; direction: "asc" | "desc" }>;
  limit?: number;
}

export interface MetricsFilter {
  column: string;
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not in";
  value: unknown;
}

export interface MetricsResponse {
  data: Array<Record<string, unknown>>;
}

// Summary Types
export interface TraceSummary {
  id: string;
  name?: string;
  userId?: string;
  sessionId?: string;
  timestamp: string;
  latency_ms?: number;
  total_cost?: number;
  total_tokens?: number;
  level?: string;
  observation_count?: number;
}

export interface ObservationSummary {
  id: string;
  traceId: string;
  type: string;
  name?: string;
  model?: string;
  startTime: string;
  latency_ms?: number;
  total_cost?: number;
  total_tokens?: number;
}

export interface ScoreSummary {
  id: string;
  traceId: string;
  name: string;
  value?: number;
  stringValue?: string;
  source: string;
  dataType: string;
}
