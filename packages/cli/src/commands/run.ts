import * as readline from "readline";
import {
  loadOperator,
  getDefaultTask,
  getTask,
  gatherContext,
  generateBriefing,
  createChatSession,
  chat,
  type ChatSession,
} from "@operator/core";

async function startChatMode(session: ChatSession): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\n───────────────────────────────────────────────────────────────");
  console.log("💬 Chat mode active. Ask follow-up questions about the briefing.");
  console.log("   Type 'exit' or press Ctrl+C to quit.\n");

  const askQuestion = (): void => {
    rl.question("You: ", async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        askQuestion();
        return;
      }

      if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
        console.log("\nGoodbye!");
        rl.close();
        return;
      }

      try {
        console.log("\nThinking...\n");
        const response = await chat(session, trimmed);
        console.log(`Assistant: ${response}\n`);
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error);
      }

      askQuestion();
    });
  };

  rl.on("close", () => {
    process.exit(0);
  });

  askQuestion();
}

export async function runCommand(
  operator: string,
  taskId: string | undefined,
  options: { verbose?: boolean; list?: boolean; chat?: boolean; param?: Record<string, string> }
) {
  const runtimeParams = options.param || {};
  const config = await loadOperator(operator);

  // List tasks mode
  if (options.list) {
    console.log(`Tasks for ${config.name}:\n`);
    for (const [id, task] of Object.entries(config.tasks)) {
      const defaultMarker = task.default ? " (default)" : "";
      console.log(`  ${id}${defaultMarker}`);
      console.log(`    ${task.name}`);
    }
    return;
  }

  // Get task to run
  let task;
  let resolvedTaskId: string;

  if (taskId) {
    task = getTask(config, taskId);
    if (!task) {
      console.error(`Task "${taskId}" not found in operator "${operator}"`);
      console.error(`Available tasks: ${Object.keys(config.tasks).join(", ")}`);
      process.exit(1);
    }
    resolvedTaskId = taskId;
  } else {
    const defaultTask = getDefaultTask(config);
    if (!defaultTask) {
      console.error(`No tasks defined in operator "${operator}"`);
      process.exit(1);
    }
    task = defaultTask.task;
    resolvedTaskId = defaultTask.id;
  }

  if (options.verbose) {
    console.log(`Loading operator: ${operator}`);
    console.log(`Running task: ${resolvedTaskId} (${task.name})`);
    if (Object.keys(runtimeParams).length > 0) {
      console.log(`Runtime params: ${JSON.stringify(runtimeParams)}`);
    }
  }

  if (options.verbose) {
    console.log(`Fetching context from ${config.sources.length} sources...`);
  }

  const context = await gatherContext(config.sources, runtimeParams);

  const errors = context.filter((c) => c.error);
  if (errors.length > 0 && options.verbose) {
    console.warn(`Warning: ${errors.length} sources failed:`);
    errors.forEach((e) => console.warn(`  - ${e.sourceName}: ${e.error}`));
  }

  if (options.verbose) {
    console.log("Generating output...\n");
  }

  // Resolve any {{params.x}} templates in the task prompt
  let resolvedPrompt = task.prompt;
  if (Object.keys(runtimeParams).length > 0) {
    resolvedPrompt = task.prompt.replace(
      /\{\{params\.(\w+)\}\}/g,
      (match, key) => runtimeParams[key] ?? match
    );
  }

  const briefing = await generateBriefing(context, resolvedPrompt);

  console.log(briefing.content);

  // Enter chat mode if requested
  if (options.chat) {
    const session = createChatSession(context, briefing.content, resolvedPrompt);
    await startChatMode(session);
  }
}
