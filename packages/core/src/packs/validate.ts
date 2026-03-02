import { parse as parseYaml } from "yaml";
import type { PackBundle, PackManifest, PackValidationResult } from "./types";

const PACK_ID_PATTERN = /^[a-z0-9-]+$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validatePackManifest(manifest: unknown): PackValidationResult {
  const errors: string[] = [];
  if (!isObject(manifest)) {
    return { valid: false, errors: ["Manifest must be an object"] };
  }

  const m = manifest as Partial<PackManifest>;

  if (m.schemaVersion !== 1) {
    errors.push("manifest.schemaVersion must be 1");
  }
  if (!m.id || typeof m.id !== "string" || !PACK_ID_PATTERN.test(m.id)) {
    errors.push("manifest.id must contain only lowercase letters, numbers, and hyphens");
  }
  if (!m.name || typeof m.name !== "string") {
    errors.push("manifest.name is required");
  }
  if (!m.version || typeof m.version !== "string" || !SEMVER_PATTERN.test(m.version)) {
    errors.push("manifest.version must be a semantic version (e.g. 1.0.0)");
  }

  if (m.files !== undefined) {
    if (!isObject(m.files)) {
      errors.push("manifest.files must be an object when provided");
    } else {
      const fileValues = Object.values(m.files);
      if (fileValues.some((value) => value !== undefined && typeof value !== "string")) {
        errors.push("manifest.files values must be strings");
      }
    }
  }

  if (m.tags !== undefined) {
    if (!Array.isArray(m.tags) || m.tags.some((tag) => typeof tag !== "string")) {
      errors.push("manifest.tags must be an array of strings");
    }
  }

  if (m.requirements !== undefined && !isObject(m.requirements)) {
    errors.push("manifest.requirements must be an object when provided");
  }

  return { valid: errors.length === 0, errors };
}

function validateOperatorYaml(operatorYaml: string): string[] {
  const errors: string[] = [];
  try {
    const parsed = parseYaml(operatorYaml) as Record<string, unknown>;
    if (!isObject(parsed)) {
      errors.push("operator.yaml must parse to an object");
      return errors;
    }
    if (typeof parsed.id !== "string" || parsed.id.trim() === "") {
      errors.push("operator.yaml id is required");
    }
    if (typeof parsed.name !== "string" || parsed.name.trim() === "") {
      errors.push("operator.yaml name is required");
    }
    if (!Array.isArray(parsed.sources) || parsed.sources.length === 0) {
      errors.push("operator.yaml requires at least one source");
    }
    const hasTasks =
      isObject(parsed.tasks) && Object.keys(parsed.tasks as Record<string, unknown>).length > 0;
    const hasBriefing = isObject(parsed.briefing) && typeof parsed.briefing.prompt === "string";
    const hasWorkflow = Array.isArray(parsed.workflow) && parsed.workflow.length > 0;
    if (!hasTasks && !hasBriefing && !hasWorkflow) {
      errors.push("operator.yaml requires tasks/briefing or workflow");
    }
  } catch {
    errors.push("operator.yaml contains invalid YAML");
  }
  return errors;
}

export function validatePackBundle(bundle: PackBundle): PackValidationResult {
  const errors: string[] = [];

  const manifestValidation = validatePackManifest(bundle.manifest);
  if (!manifestValidation.valid) {
    errors.push(...manifestValidation.errors);
  }

  if (!bundle.operatorYaml || bundle.operatorYaml.trim() === "") {
    errors.push("operatorYaml is required");
  } else {
    errors.push(...validateOperatorYaml(bundle.operatorYaml));
  }

  return { valid: errors.length === 0, errors };
}
