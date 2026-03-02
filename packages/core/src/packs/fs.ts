import { cp, mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { LoadedPack, PackBundle, PackManifest } from "./types";

export function resolvePackFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function loadPackFromDirectory(path: string): Promise<LoadedPack> {
  const packPath = resolve(path);
  const manifestPath = resolve(packPath, "manifest.json");
  const rawManifest = await readFile(manifestPath, "utf-8");
  const manifest = JSON.parse(rawManifest) as PackManifest;

  const operatorFile = manifest.files?.operator || "operator.yaml";
  const readmeFile = manifest.files?.readme || "README.md";
  const fixtureFile = manifest.files?.fixtureContext || "fixtures/context.json";

  const operatorYaml = await readFile(resolve(packPath, operatorFile), "utf-8");

  let readme: string | undefined;
  if (existsSync(resolve(packPath, readmeFile))) {
    readme = await readFile(resolve(packPath, readmeFile), "utf-8");
  }

  let fixtureContext: unknown;
  if (existsSync(resolve(packPath, fixtureFile))) {
    const fixtureRaw = await readFile(resolve(packPath, fixtureFile), "utf-8");
    fixtureContext = JSON.parse(fixtureRaw);
  }

  return {
    path: packPath,
    bundle: {
      manifest,
      operatorYaml,
      readme,
      fixtureContext,
    },
  };
}

export async function savePackBundle(bundle: PackBundle, targetDir: string): Promise<string> {
  const baseDir = resolve(targetDir);
  const resolvedPackId = resolvePackFileName(bundle.manifest.id);
  const resolvedVersion = resolvePackFileName(bundle.manifest.version);
  const packDir = resolve(baseDir, resolvedPackId, resolvedVersion);

  await mkdir(packDir, { recursive: true });

  const manifestWithFiles: PackManifest = {
    ...bundle.manifest,
    files: {
      operator: "operator.yaml",
      readme: "README.md",
      fixtureContext: bundle.fixtureContext !== undefined ? "fixtures/context.json" : undefined,
    },
  };

  await writeFile(
    resolve(packDir, "manifest.json"),
    JSON.stringify(manifestWithFiles, null, 2),
    "utf-8"
  );
  await writeFile(resolve(packDir, "operator.yaml"), bundle.operatorYaml, "utf-8");

  if (bundle.readme) {
    await writeFile(resolve(packDir, "README.md"), bundle.readme, "utf-8");
  }

  if (bundle.fixtureContext !== undefined) {
    const fixturesDir = resolve(packDir, "fixtures");
    await mkdir(fixturesDir, { recursive: true });
    await writeFile(
      resolve(fixturesDir, "context.json"),
      JSON.stringify(bundle.fixtureContext, null, 2),
      "utf-8"
    );
  }

  return packDir;
}

export async function installPackBundleAsOperator(
  bundle: PackBundle,
  operatorsDir: string
): Promise<{ operatorId: string; operatorPath: string }> {
  await mkdir(operatorsDir, { recursive: true });
  const parsedOperator = parseYaml(bundle.operatorYaml) as Record<string, unknown>;
  const id =
    typeof parsedOperator.id === "string" && parsedOperator.id.trim() !== ""
      ? parsedOperator.id
      : bundle.manifest.id;

  const operatorPath = resolve(operatorsDir, `${resolvePackFileName(id)}.yaml`);
  await writeFile(operatorPath, bundle.operatorYaml, "utf-8");
  return { operatorId: id, operatorPath };
}

export async function copyPackDirectory(sourceDir: string, targetDir: string): Promise<void> {
  await mkdir(dirname(targetDir), { recursive: true });
  await cp(sourceDir, targetDir, { recursive: true });
}

export function fixtureToContextResults(
  fixture: unknown
): Array<{ sourceId: string; sourceName: string; data: unknown; error?: string }> {
  if (Array.isArray(fixture)) {
    return fixture.map((entry, index) => {
      const row = entry as Record<string, unknown>;
      const sourceId =
        typeof row.sourceId === "string" ? row.sourceId : `fixture-source-${index + 1}`;
      const sourceName =
        typeof row.sourceName === "string" ? row.sourceName : sourceId;
      return {
        sourceId,
        sourceName,
        data: row.data,
      };
    });
  }

  if (fixture && typeof fixture === "object") {
    return Object.entries(fixture as Record<string, unknown>).map(([key, value]) => ({
      sourceId: key,
      sourceName: key,
      data: value,
    }));
  }

  return [];
}

export function bundleToJson(bundle: PackBundle): string {
  return JSON.stringify(
    {
      manifest: bundle.manifest,
      operatorYaml: bundle.operatorYaml,
      readme: bundle.readme,
      fixtureContext: bundle.fixtureContext,
    },
    null,
    2
  );
}

export function parseBundleJson(raw: string): PackBundle {
  const parsed = JSON.parse(raw) as PackBundle;
  return parsed;
}

export function bundleToYamlManifest(bundle: PackBundle): string {
  return stringifyYaml(bundle.manifest);
}
