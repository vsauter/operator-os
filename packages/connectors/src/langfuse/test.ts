#!/usr/bin/env npx tsx
/**
 * Quick test script for the Langfuse connector
 *
 * Usage:
 *   LANGFUSE_PUBLIC_KEY=pk-lf-xxx LANGFUSE_SECRET_KEY=sk-lf-xxx npx tsx packages/connectors/src/langfuse/test.ts
 *
 * Or for US region:
 *   LANGFUSE_PUBLIC_KEY=pk-lf-xxx LANGFUSE_SECRET_KEY=sk-lf-xxx LANGFUSE_API_URL=https://us.cloud.langfuse.com npx tsx packages/connectors/src/langfuse/test.ts
 */

import { LangfuseClient } from "./client.js";

async function main() {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const baseUrl = process.env.LANGFUSE_API_URL || "https://cloud.langfuse.com";

  if (!publicKey || !secretKey) {
    console.error("Missing required environment variables:");
    console.error("  LANGFUSE_PUBLIC_KEY - Your Langfuse public key (pk-lf-...)");
    console.error("  LANGFUSE_SECRET_KEY - Your Langfuse secret key (sk-lf-...)");
    console.error("");
    console.error("Optional:");
    console.error("  LANGFUSE_API_URL - API URL (default: https://cloud.langfuse.com)");
    process.exit(1);
  }

  const client = new LangfuseClient(publicKey, secretKey, baseUrl);

  console.log("Testing Langfuse connector...");
  console.log(`API URL: ${baseUrl}`);
  console.log("");

  // Test 1: Get recent traces
  console.log("1. Fetching recent traces (last 7 days)...");
  try {
    const traces = await client.getRecentTraces(10, 7);
    console.log(`   Found ${traces.length} traces`);
    if (traces.length > 0) {
      const trace = traces[0];
      console.log(`   First trace: ${trace.name || trace.id}`);
      console.log(`     - Timestamp: ${trace.timestamp}`);
      console.log(`     - Tokens: ${trace.totalTokens || 0}`);
      console.log(`     - Cost: $${trace.totalCost?.toFixed(4) || 0}`);
    }
  } catch (error) {
    console.error(`   Error: ${error}`);
  }
  console.log("");

  // Test 2: Get usage summary
  console.log("2. Getting usage summary (last 7 days)...");
  try {
    const summary = await client.getTraceSummary(7);
    console.log(`   Total traces: ${summary.total_traces}`);
    console.log(`   Total cost: $${summary.total_cost.toFixed(4)}`);
    console.log(`   Total tokens: ${summary.total_tokens}`);
    console.log(`   Avg latency: ${summary.avg_latency_ms}ms`);
    console.log(`   Errors: ${summary.error_count}`);
  } catch (error) {
    console.error(`   Error: ${error}`);
  }
  console.log("");

  // Test 3: Get model usage
  console.log("3. Getting model usage breakdown...");
  try {
    const models = await client.getModelUsage(7);
    console.log(`   Found ${models.length} models used`);
    for (const model of models.slice(0, 5)) {
      console.log(`   - ${model.model}: ${model.count} calls, ${model.total_tokens} tokens, $${model.total_cost.toFixed(4)}`);
    }
  } catch (error) {
    console.error(`   Error: ${error}`);
  }
  console.log("");

  // Test 4: Get observations (generations)
  console.log("4. Fetching recent generations...");
  try {
    const generations = await client.getGenerations(5, 7);
    console.log(`   Found ${generations.length} generations`);
    for (const gen of generations.slice(0, 3)) {
      console.log(`   - ${gen.model || "unknown"}: ${gen.usage?.total || 0} tokens`);
    }
  } catch (error) {
    console.error(`   Error: ${error}`);
  }
  console.log("");

  // Test 5: Get scores
  console.log("5. Fetching recent scores...");
  try {
    const scores = await client.getRecentScores(10, 7);
    console.log(`   Found ${scores.length} scores`);
    for (const score of scores.slice(0, 3)) {
      const value = score.value !== undefined ? score.value : score.stringValue;
      console.log(`   - ${score.name}: ${value} (${score.source})`);
    }
  } catch (error) {
    console.error(`   Error: ${error}`);
  }
  console.log("");

  // Test 6: Get sessions
  console.log("6. Fetching sessions...");
  try {
    const sessions = await client.getSessions(1, 5);
    console.log(`   Found ${sessions.length} sessions`);
    for (const session of sessions.slice(0, 3)) {
      console.log(`   - ${session.id}: $${session.totalCost?.toFixed(4) || 0}`);
    }
  } catch (error) {
    console.error(`   Error: ${error}`);
  }
  console.log("");

  // Test 7: Get prompts
  console.log("7. Fetching prompts...");
  try {
    const prompts = await client.getPrompts(1, 5);
    console.log(`   Found ${prompts.length} prompts`);
    for (const prompt of prompts.slice(0, 3)) {
      console.log(`   - ${prompt.name} (v${prompt.version}, ${prompt.type})`);
    }
  } catch (error) {
    console.error(`   Error: ${error}`);
  }
  console.log("");

  // Test 8: Get users
  console.log("8. Fetching users...");
  try {
    const users = await client.getUsers(7, 100);
    console.log(`   Found ${users.length} users`);
    for (const user of users.slice(0, 5)) {
      console.log(`   - ${user.userId}: ${user.traceCount} traces, $${user.totalCost.toFixed(4)}`);
    }
  } catch (error) {
    console.error(`   Error: ${error}`);
  }
  console.log("");

  console.log("Done! Connector is working.");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
