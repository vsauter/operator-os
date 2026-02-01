export interface MCPConnection {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

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

export interface OperatorConfig {
  id: string;
  name: string;
  description?: string;
  sources: ContextSource[];
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
