// PostHog API Types

export interface PostHogEvent {
  id: string;
  distinct_id: string;
  event: string;
  timestamp: string;
  properties: Record<string, unknown>;
}

export interface PostHogPerson {
  id: string;
  distinct_ids: string[];
  properties: Record<string, unknown>;
  created_at: string;
}

export interface PostHogInsight {
  id: number;
  name: string;
  description?: string;
  result?: unknown[];
}

export interface PostHogFeatureFlag {
  id: number;
  key: string;
  name: string;
  active: boolean;
  filters?: Record<string, unknown>;
  created_at?: string;
}

export interface PostHogCohort {
  id: number;
  name: string;
  description?: string;
  count?: number;
  created_at?: string;
}

export interface PostHogEventDefinition {
  name: string;
  volume_30_day: number;
  query_usage_30_day?: number;
  last_seen_at?: string;
}

export interface EventsResponse {
  results: PostHogEvent[];
  next?: string;
}

export interface PersonsResponse {
  results: PostHogPerson[];
  next?: string;
}

export interface HogQLResponse {
  results: unknown[][];
  columns: string[];
}

export interface ActiveUser {
  distinct_id: string;
  event_count: number;
  last_seen: string;
}

export interface EventCount {
  event: string;
  count: number;
}

export interface EventFilters {
  event?: string;
  distinct_id?: string;
  limit?: number;
  after?: string;
  before?: string;
}

export interface PersonFilters {
  search?: string;
  distinct_id?: string;
  limit?: number;
}
