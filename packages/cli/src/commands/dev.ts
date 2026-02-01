import { spawn } from "child_process";
import { resolve } from "path";

export async function devCommand(options: { port?: string }) {
  const port = options.port || "3000";
  const uiDir = resolve(process.cwd(), "packages", "ui");

  console.log(`Starting OperatorOS UI on http://localhost:${port}`);

  const nextDev = spawn("pnpm", ["next", "dev", "-p", port], {
    cwd: uiDir,
    stdio: "inherit",
    env: { ...process.env },
  });

  // Open browser after a short delay
  setTimeout(() => {
    const url = `http://localhost:${port}`;
    const openCmd =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
        ? "start"
        : "xdg-open";

    spawn(openCmd, [url], { stdio: "ignore" });
  }, 2000);

  nextDev.on("error", (err) => {
    console.error("Failed to start UI:", err.message);
    process.exit(1);
  });

  nextDev.on("close", (code) => {
    process.exit(code || 0);
  });
}
