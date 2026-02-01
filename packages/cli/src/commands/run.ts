import { loadOperator, getDefaultTask, getTask, gatherContext, generateBriefing } from "@operator/core";

export async function runCommand(
  operator: string,
  taskId: string | undefined,
  options: { verbose?: boolean; list?: boolean }
) {
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
  }

  if (options.verbose) {
    console.log(`Fetching context from ${config.sources.length} sources...`);
  }

  const context = await gatherContext(config.sources);

  const errors = context.filter((c) => c.error);
  if (errors.length > 0 && options.verbose) {
    console.warn(`Warning: ${errors.length} sources failed:`);
    errors.forEach((e) => console.warn(`  - ${e.sourceName}: ${e.error}`));
  }

  if (options.verbose) {
    console.log("Generating output...\n");
  }

  const briefing = await generateBriefing(context, task.prompt);

  console.log(briefing.content);
}
