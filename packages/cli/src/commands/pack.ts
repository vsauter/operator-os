import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import { dirname, resolve } from "path";
import {
  loadPackFromDirectory,
  savePackBundle,
  validatePackBundle,
  type PackBundle,
} from "@operator/core";

function findProjectRoot(): string {
  let dir = process.cwd();
  while (true) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return process.cwd();
    }
    dir = parent;
  }
}

function printPackSummary(bundle: PackBundle): void {
  const reqConnectors = bundle.manifest.requirements?.connectors || [];
  console.log(`Pack: ${bundle.manifest.name} (${bundle.manifest.id}@${bundle.manifest.version})`);
  if (bundle.manifest.description) {
    console.log(`Description: ${bundle.manifest.description}`);
  }
  if (reqConnectors.length > 0) {
    console.log(`Required connectors: ${reqConnectors.join(", ")}`);
  }
}

export async function packTestCommand(path: string): Promise<void> {
  const { bundle } = await loadPackFromDirectory(path);
  const result = validatePackBundle(bundle);
  if (!result.valid) {
    console.error("Pack validation failed:");
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  printPackSummary(bundle);
  console.log("Status: valid");
}

export async function packPublishCommand(
  path: string,
  options: { outDir?: string }
): Promise<void> {
  const { bundle } = await loadPackFromDirectory(path);
  const result = validatePackBundle(bundle);
  if (!result.valid) {
    console.error("Pack validation failed:");
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  const projectRoot = findProjectRoot();
  const outputDir =
    options.outDir && options.outDir.trim() !== ""
      ? resolve(options.outDir)
      : resolve(projectRoot, "config", "packs", "published");

  await mkdir(outputDir, { recursive: true });
  const savedPath = await savePackBundle(bundle, outputDir);
  printPackSummary(bundle);
  console.log(`Published to: ${savedPath}`);
}
