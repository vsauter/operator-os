// @operator/connectors - MCP connectors for various data sources

// Gong connector
export { createGongServer, GongClient, MockGongClient } from "./gong/index.js";
export type {
  GongCall,
  GongDeal,
  GongUser,
  GongAccount,
  GongParty,
  GongCallStats,
  GongDealActivity,
  CallFilters as GongCallFilters,
  DealFilters as GongDealFilters,
} from "./gong/index.js";

// Pylon connector
export { createPylonServer, PylonClient, MockPylonClient } from "./pylon/index.js";
export type {
  PylonIssue,
  PylonAccount,
  PylonContact,
  PylonUser,
  IssueState,
  IssuePriority,
  IssueFilters,
  SearchFilter,
} from "./pylon/index.js";

// HubSpot connector
export { createHubSpotServer, HubSpotClient, MockHubSpotClient } from "./hubspot/index.js";
export type {
  HubSpotContact,
  HubSpotCompany,
  HubSpotDeal,
  HubSpotOwner,
  EnrichedHubSpotDeal,
  HubSpotEngagement,
  HubSpotPipeline,
  PipelineSummary,
  CRMMetrics,
} from "./hubspot/index.js";

// PostHog connector
export { createPostHogServer, PostHogClient, MockPostHogClient } from "./posthog/index.js";
export type {
  PostHogEvent,
  PostHogPerson,
  PostHogInsight,
  PostHogFeatureFlag,
  PostHogCohort,
  PostHogEventDefinition,
  EventFilters as PostHogEventFilters,
  PersonFilters as PostHogPersonFilters,
} from "./posthog/index.js";

// Langfuse connector
export { createLangfuseServer, LangfuseClient, MockLangfuseClient } from "./langfuse/index.js";
export type {
  LangfuseTrace,
  LangfuseObservation,
  LangfuseScore,
  LangfuseSession,
  LangfusePrompt,
  LangfuseUsage,
  TraceFilters as LangfuseTraceFilters,
  ObservationFilters as LangfuseObservationFilters,
  ScoreFilters as LangfuseScoreFilters,
} from "./langfuse/index.js";
