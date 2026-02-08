/**
 * Credential storage utilities
 * Manages credentials in ~/.operator/credentials/
 */

import { readFile, writeFile, mkdir, chmod } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

/**
 * Sanitize connector ID to prevent path traversal attacks
 */
function sanitizeConnectorId(connectorId: string): string {
  // Remove any path separators and dangerous characters
  return connectorId
    .replace(/[/\\]/g, "-")
    .replace(/\.\./g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .toLowerCase();
}

/**
 * Parse a simple .env file format
 */
function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();

    if (key) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Get the path to the operator credentials directory
 */
export function getCredentialsDir(): string {
  return join(homedir(), ".operator", "credentials");
}

/**
 * Get the path to a connector's credentials file
 */
export function getCredentialsPath(connectorId: string): string {
  const safeId = sanitizeConnectorId(connectorId);
  return join(getCredentialsDir(), `${safeId}.env`);
}

/**
 * Ensure the credentials directory exists with secure permissions
 */
export async function ensureCredentialsDir(): Promise<void> {
  const dir = getCredentialsDir();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true, mode: 0o700 });
  }
}

/**
 * Save credentials for a connector with secure file permissions
 */
export async function saveCredentials(
  connectorId: string,
  credentials: Record<string, string>
): Promise<string> {
  await ensureCredentialsDir();

  const filePath = getCredentialsPath(connectorId);
  const content = Object.entries(credentials)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  await writeFile(filePath, content + "\n", { encoding: "utf-8", mode: 0o600 });
  return filePath;
}

/**
 * Load credentials for a connector
 */
export async function loadCredentials(
  connectorId: string
): Promise<Record<string, string> | null> {
  const filePath = getCredentialsPath(connectorId);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = await readFile(filePath, "utf-8");
    return parseEnvFile(content);
  } catch {
    return null;
  }
}

/**
 * Get a specific credential value for a connector
 * Checks local credentials file first, then environment variables
 */
export async function getCredential(
  connectorId: string,
  key: string
): Promise<string | null> {
  // Check environment variable first
  if (process.env[key]) {
    return process.env[key]!;
  }

  // Check local credentials file
  const credentials = await loadCredentials(connectorId);
  if (credentials && credentials[key]) {
    return credentials[key];
  }

  return null;
}

/**
 * Delete credentials for a connector
 */
export async function deleteCredentials(connectorId: string): Promise<boolean> {
  const filePath = getCredentialsPath(connectorId);

  if (!existsSync(filePath)) {
    return false;
  }

  const { unlink } = await import("fs/promises");
  await unlink(filePath);
  return true;
}
