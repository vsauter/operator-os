export interface PackManifest {
  schemaVersion: 1;
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  homepage?: string;
  tags?: string[];
  requirements?: {
    connectors?: string[];
    capabilities?: string[];
  };
  policy?: {
    defaultApprovalMode?: "auto" | "ask" | "never";
    sideEffects?: "none" | "approval-required" | "allowed";
  };
  files?: {
    operator?: string;
    readme?: string;
    fixtureContext?: string;
  };
}

export interface PackBundle {
  manifest: PackManifest;
  operatorYaml: string;
  readme?: string;
  fixtureContext?: unknown;
}

export interface PackValidationResult {
  valid: boolean;
  errors: string[];
}

export interface LoadedPack {
  bundle: PackBundle;
  path: string;
}
