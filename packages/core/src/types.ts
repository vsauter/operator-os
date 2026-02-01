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

export interface PersonaConfig {
  id: string;
  name: string;
  description?: string;
  sources: ContextSource[];
  briefing: {
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
