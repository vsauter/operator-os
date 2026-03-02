import { readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import { dirname, join, resolve } from "path";

const SAFE_ID_PATTERN = /^[a-z0-9-]+$/;
const SAFE_VERSION_PATTERN = /^[0-9A-Za-z.+-]+$/;

function toInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareSemverLike(a: string, b: string): number {
  const aMain = a.split("-")[0].split(".");
  const bMain = b.split("-")[0].split(".");
  const maxLength = Math.max(aMain.length, bMain.length);
  for (let i = 0; i < maxLength; i += 1) {
    const diff = toInt(aMain[i] || "0") - toInt(bMain[i] || "0");
    if (diff !== 0) {
      return diff;
    }
  }
  return a.localeCompare(b);
}

export function assertSafePackId(id: string): void {
  if (!SAFE_ID_PATTERN.test(id)) {
    throw new Error("Invalid pack id format");
  }
}

export function assertSafeVersion(version: string): void {
  if (!SAFE_VERSION_PATTERN.test(version)) {
    throw new Error("Invalid pack version format");
  }
}

export function findProjectRoot(): string {
  let dir = process.cwd();

  while (true) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    if (existsSync(resolve(dir, "config")) && existsSync(resolve(dir, "connectors"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return process.cwd();
    }
    dir = parent;
  }
}

export function getPackRegistryDirs(projectRoot = findProjectRoot()): {
  importedDir: string;
  publishedDir: string;
  installedDir: string;
  localDir: string;
  localOperatorsDir: string;
} {
  return {
    importedDir: join(projectRoot, "config", "packs", "imported"),
    publishedDir: join(projectRoot, "config", "packs", "published"),
    installedDir: join(projectRoot, "config", "packs", "installed"),
    localDir: join(projectRoot, "config", "packs", "local"),
    localOperatorsDir: join(projectRoot, "config", "operators", "local"),
  };
}

export async function resolvePackDirectory(
  baseDir: string,
  id: string,
  version?: string
): Promise<{ dir: string; version: string }> {
  assertSafePackId(id);

  const idDir = join(baseDir, id);
  if (!existsSync(idDir)) {
    throw new Error(`Pack not found: ${id}`);
  }

  const versions = (await readdir(idDir))
    .filter((entry) => SAFE_VERSION_PATTERN.test(entry))
    .sort(compareSemverLike);

  if (versions.length === 0) {
    throw new Error(`No versions found for pack: ${id}`);
  }

  const selectedVersion = version || versions[versions.length - 1];
  assertSafeVersion(selectedVersion);

  const dir = join(idDir, selectedVersion);
  const st = await stat(dir);
  if (!st.isDirectory()) {
    throw new Error(`Pack version not found: ${id}@${selectedVersion}`);
  }

  return { dir, version: selectedVersion };
}
