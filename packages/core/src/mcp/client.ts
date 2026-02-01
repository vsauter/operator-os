import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { MCPConnection } from "../types.js";

export async function createClient(connection: MCPConnection): Promise<Client> {
  const transport = new StdioClientTransport({
    command: connection.command,
    args: connection.args,
    env: { ...process.env, ...connection.env },
  });

  const client = new Client(
    { name: "operator-os", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  await client.connect(transport);
  return client;
}

export async function callTool(
  client: Client,
  tool: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const result = await client.callTool({ name: tool, arguments: args });
  return result.content;
}

export async function closeClient(client: Client): Promise<void> {
  await client.close();
}
