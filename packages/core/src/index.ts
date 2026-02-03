export * from "./types";
export { createClient, callTool, closeClient } from "./mcp/client";
export { gatherContext } from "./context/aggregator";
export { generateBriefing } from "./briefing/builder";
export type { BriefingOptions } from "./briefing/builder";
export { loadOperator, getDefaultTask, getTask } from "./operator/loader";

// Goals exports
export {
  loadGoals,
  loadGoalsWithSource,
  getGoalsContext,
  formatGoalsForPrompt,
  getGoalsPaths,
  getProjectGoalsPath,
} from "./goals/loader";
export type { Goal, GoalsConfig, OrganizationConfig, GoalsLoadResult } from "./goals/loader";

// Connector registry exports
export * from "./connectors/index";

// Chat exports
export { createChatSession, chat } from "./chat/session";
export type { ChatSession, ChatMessage } from "./chat/session";
