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
