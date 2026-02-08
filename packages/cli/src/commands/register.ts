/**
 * Register command
 * Registers an MCP server as a connector
 */

import * as readline from "readline";
import {
  checkPackageExists,
  discoverMcpServer,
  generateConnectorDefinition,
  saveConnectorDefinition,
  saveCredentials,
} from "@operator/core";

/**
 * Prompt the user for input (returns default if non-interactive)
 */
function prompt(
  rl: readline.Interface,
  question: string,
  defaultValue: string,
  options: { hidden?: boolean; interactive?: boolean }
): Promise<string> {
  return new Promise((resolve) => {
    // Non-interactive mode: return default immediately
    if (!options.interactive) {
      resolve(defaultValue);
      return;
    }

    if (options.hidden && process.stdin.isTTY) {
      // For password input, we need to handle it specially
      process.stdout.write(question);
      let input = "";

      const stdin = process.stdin;
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding("utf8");

      const onData = (char: string) => {
        if (char === "\n" || char === "\r" || char === "\u0004") {
          stdin.setRawMode(false);
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(input || defaultValue);
        } else if (char === "\u0003") {
          // Ctrl+C
          process.exit();
        } else if (char === "\u007F" || char === "\b") {
          // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
          }
        } else {
          input += char;
        }
      };

      stdin.on("data", onData);
    } else {
      rl.question(question, (answer) => {
        resolve(answer.trim() || defaultValue);
      });
    }
  });
}

/**
 * Extract suggested connector ID from package name
 */
function suggestConnectorId(packageName: string): string {
  // @modelcontextprotocol/server-slack -> slack
  // @foo/mcp-github -> github
  const parts = packageName.split("/");
  const name = parts[parts.length - 1];

  return name
    .replace(/^(server-|mcp-)/, "")
    .replace(/(-server|-mcp)$/, "")
    .toLowerCase();
}

export async function registerCommand(
  packageName: string,
  options: { verbose?: boolean; yes?: boolean }
): Promise<void> {
  const isInteractive = Boolean(process.stdin.isTTY) && !options.yes;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // Step 1: Check if package exists
    if (options.verbose) {
      console.log(`Checking package ${packageName}...`);
    }

    const exists = await checkPackageExists(packageName);
    if (!exists) {
      console.error(`\n✗ Package not found: ${packageName}`);
      console.error(`\nMake sure the package name is correct and published to npm.`);
      process.exit(1);
    }

    console.log(`\n✓ Found ${packageName}`);

    // Step 2: First discovery attempt (will likely fail without credentials)
    console.log(`  Checking for required credentials...`);

    let discoveryResult = await discoverMcpServer(packageName, {});
    let credentials: Record<string, string> = {};

    // Step 3: If credentials are required, prompt for them
    if (!discoveryResult.success && discoveryResult.requiredEnvVars && discoveryResult.requiredEnvVars.length > 0) {
      if (!isInteractive) {
        console.error(`\n✗ Credentials required but running in non-interactive mode.`);
        console.error(`\nRequired credentials:`);
        for (const envVar of discoveryResult.requiredEnvVars) {
          console.error(`  • ${envVar}`);
        }
        console.error(`\nRun interactively or set environment variables.`);
        process.exit(1);
      }

      console.log(`\n  Credentials required to connect.\n`);
      console.log(`Enter credentials:\n`);

      for (const envVar of discoveryResult.requiredEnvVars) {
        const value = await prompt(rl, `${envVar}: `, "", { hidden: true, interactive: true });
        credentials[envVar] = value;
      }

      // Step 4: Retry with credentials
      console.log(`\nConnecting...`);
      discoveryResult = await discoverMcpServer(packageName, credentials);
    } else if (!discoveryResult.success) {
      // Failed for a different reason
      console.error(`\n✗ Failed to connect: ${discoveryResult.error}`);
      process.exit(1);
    }

    // Step 5: Check if discovery succeeded
    if (!discoveryResult.success) {
      console.error(`\n✗ Failed to connect: ${discoveryResult.error}`);

      if (discoveryResult.requiredEnvVars && discoveryResult.requiredEnvVars.length > 0) {
        console.error(`\nThe server may require additional credentials:`);
        for (const envVar of discoveryResult.requiredEnvVars) {
          console.error(`  • ${envVar}`);
        }
      }

      process.exit(1);
    }

    console.log(`✓ Connected`);
    console.log(`✓ Discovered ${discoveryResult.tools.length} tools`);

    if (options.verbose) {
      console.log(`\nTools:`);
      for (const tool of discoveryResult.tools) {
        console.log(`  • ${tool.name}`);
        if (tool.description) {
          console.log(`    ${tool.description}`);
        }
      }
    }

    // Step 6: Prompt for connector ID (use default in non-interactive mode)
    const suggestedId = suggestConnectorId(packageName);
    const finalId = await prompt(
      rl,
      `\nConnector ID [${suggestedId}]: `,
      suggestedId,
      { interactive: isInteractive }
    );

    // Step 7: Generate and save connector definition
    const envVars = Object.keys(credentials);
    const connector = generateConnectorDefinition(
      finalId,
      packageName,
      discoveryResult.tools,
      envVars
    );

    const connectorPath = await saveConnectorDefinition(connector);

    // Step 8: Save credentials if any
    let credentialsPath: string | undefined;
    if (envVars.length > 0) {
      credentialsPath = await saveCredentials(finalId, credentials);
    }

    // Step 9: Print success message
    console.log(`\n✓ Registered ${finalId}\n`);
    console.log(`Saved:`);
    console.log(`  ${connectorPath}`);
    if (credentialsPath) {
      console.log(`  ${credentialsPath}`);
    }

    // Step 10: Show usage example
    const firstTool = discoveryResult.tools[0];
    console.log(`\nUse in operator config:`);
    console.log(`  sources:`);
    console.log(`    - connector: ${finalId}`);
    console.log(`      fetch: ${firstTool?.name || "tool_name"}`);

  } finally {
    rl.close();
  }
}
