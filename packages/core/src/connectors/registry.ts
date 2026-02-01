/**
 * Connector Registry
 * Loads and manages connector definitions from YAML files
 */

import { readFile, readdir } from "fs/promises";
import { resolve, join } from "path";
import { parse } from "yaml";
import type { ConnectorDefinition } from "./types.js";

// Singleton registry instance
let registryInstance: ConnectorRegistry | null = null;

export class ConnectorRegistry {
  private connectors: Map<string, ConnectorDefinition> = new Map();
  private loaded = false;

  /**
   * Load all connector definitions from search paths
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    const searchPaths = this.getSearchPaths();

    for (const searchPath of searchPaths) {
      await this.loadFromDirectory(searchPath);
    }

    this.loaded = true;
  }

  /**
   * Get search paths for connector YAML files
   */
  private getSearchPaths(): string[] {
    const home = process.env.HOME || "";
    const paths: string[] = [];

    // Allow explicit override via env var
    if (process.env.OPERATOR_CONNECTORS_PATH) {
      paths.push(resolve(process.env.OPERATOR_CONNECTORS_PATH));
    }

    // Look for connectors relative to cwd
    paths.push(resolve("./connectors"));

    // Also check parent directories (for monorepo setups)
    paths.push(resolve("../connectors"));
    paths.push(resolve("../../connectors"));

    // User-specific connectors
    paths.push(resolve(join(home, ".operator/connectors")));

    return paths;
  }

  /**
   * Load connector definitions from a directory
   */
  private async loadFromDirectory(dirPath: string): Promise<void> {
    try {
      const files = await readdir(dirPath);
      const yamlFiles = files.filter(
        (f) => f.endsWith(".yaml") || f.endsWith(".yml")
      );

      for (const file of yamlFiles) {
        const filePath = join(dirPath, file);
        await this.loadConnector(filePath);
      }
    } catch {
      // Directory doesn't exist, skip silently
    }
  }

  /**
   * Load a single connector definition from a file
   */
  private async loadConnector(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, "utf-8");
      const connector = parse(content) as ConnectorDefinition;

      if (!connector.id) {
        console.warn(`Connector at ${filePath} missing 'id' field, skipping`);
        return;
      }

      // Don't override if already loaded (first path wins)
      if (!this.connectors.has(connector.id)) {
        this.connectors.set(connector.id, connector);
      }
    } catch (error) {
      console.warn(`Failed to load connector from ${filePath}:`, error);
    }
  }

  /**
   * Get a connector by ID
   */
  get(id: string): ConnectorDefinition | undefined {
    return this.connectors.get(id);
  }

  /**
   * Check if a connector exists
   */
  has(id: string): boolean {
    return this.connectors.has(id);
  }

  /**
   * List all loaded connectors
   */
  list(): ConnectorDefinition[] {
    return Array.from(this.connectors.values());
  }

  /**
   * List all connector IDs
   */
  listIds(): string[] {
    return Array.from(this.connectors.keys());
  }

  /**
   * Clear the registry (useful for testing)
   */
  clear(): void {
    this.connectors.clear();
    this.loaded = false;
  }

  /**
   * Manually register a connector (useful for testing)
   */
  register(connector: ConnectorDefinition): void {
    this.connectors.set(connector.id, connector);
  }
}

/**
 * Get the singleton registry instance
 */
export function getRegistry(): ConnectorRegistry {
  if (!registryInstance) {
    registryInstance = new ConnectorRegistry();
  }
  return registryInstance;
}

/**
 * Initialize the registry (loads all connectors)
 */
export async function initRegistry(): Promise<ConnectorRegistry> {
  const registry = getRegistry();
  await registry.load();
  return registry;
}

/**
 * Reset the registry (for testing)
 */
export function resetRegistry(): void {
  if (registryInstance) {
    registryInstance.clear();
  }
  registryInstance = null;
}
