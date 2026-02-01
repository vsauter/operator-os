import { loadOperator, gatherContext, generateBriefing } from "@operator/core";

export async function runCommand(operator: string, options: { verbose?: boolean }) {
  if (options.verbose) {
    console.log(`Loading operator: ${operator}`);
  }

  const config = await loadOperator(operator);

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
    console.log("Generating briefing...\n");
  }

  const briefing = await generateBriefing(context, config.briefing?.prompt);

  console.log(briefing.content);
}
