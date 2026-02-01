export * from "./types.js";
export { createClient, callTool, closeClient } from "./mcp/client.js";
export { gatherContext } from "./context/aggregator.js";
export { generateBriefing } from "./briefing/builder.js";
export type { BriefingOptions } from "./briefing/builder.js";
export { loadOperator, getDefaultTask, getTask } from "./operator/loader.js";

// Goals exports
export { loadGoals, getGoalsContext, formatGoalsForPrompt } from "./goals/loader.js";
export type { Goal, GoalsConfig, OrganizationConfig } from "./goals/loader.js";

// Connector registry exports
export * from "./connectors/index.js";
