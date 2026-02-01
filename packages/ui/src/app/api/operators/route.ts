import { NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { parse } from "yaml";
import { join } from "path";

export async function GET() {
  try {
    const operatorsDir = join(process.cwd(), "..", "..", "config", "operators", "examples");
    const files = await readdir(operatorsDir);
    const yamlFiles = files.filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

    const operators = await Promise.all(
      yamlFiles.map(async (file) => {
        const content = await readFile(join(operatorsDir, file), "utf-8");
        const config = parse(content);
        return {
          id: config.id,
          name: config.name,
          description: config.description,
          sources: config.sources.map((s: { id: string; name: string }) => ({
            id: s.id,
            name: s.name,
          })),
        };
      })
    );

    return NextResponse.json({ operators });
  } catch (error) {
    console.error("Failed to load operators:", error);
    return NextResponse.json({ error: "Failed to load operators" }, { status: 500 });
  }
}
