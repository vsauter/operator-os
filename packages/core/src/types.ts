// Re-export connector types for convenience
export type {
  ConnectorSource,
  LegacySource,
  OperatorSource,
} from "./connectors/types";
export { isConnectorSource, isLegacySource } from "./connectors/types";

export interface MCPConnection {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

// Legacy ContextSource type (for backward compatibility)
export interface ContextSource {
  id: string;
  name: string;
  connection: MCPConnection;
  tool: string;
  args: Record<string, unknown>;
}

export interface Task {
  name: string;
  prompt: string;
  default?: boolean;
}

// Import OperatorSource from connectors for the new config type
import type { OperatorSource } from "./connectors/types";

export interface OperatorConfig {
  id: string;
  name: string;
  description?: string;
  sources: OperatorSource[];
  tasks: Record<string, Task>;
  // Backward compatibility
  briefing?: {
    prompt: string;
  };
}

export interface ContextResult {
  sourceId: string;
  sourceName: string;
  data: unknown;
  error?: string;
}

export interface Briefing {
  content: string;
  generatedAt: Date;
  sources: string[];
}
