import { NextResponse } from "next/server";
import { readFile, writeFile, unlink, readdir } from "fs/promises";
import { parse } from "yaml";
import { join } from "path";
import { validateOperator } from "@/lib/operatorSchema";

const OPERATORS_DIR = join(process.cwd(), "..", "..", "config", "operators", "examples");

async function findOperatorFile(id: string): Promise<string | null> {
  const files = await readdir(OPERATORS_DIR);
  for (const file of files) {
    if (!file.endsWith(".yaml") && !file.endsWith(".yml")) continue;
    const content = await readFile(join(OPERATORS_DIR, file), "utf-8");
    const config = parse(content);
    if (config.id === id) {
      return join(OPERATORS_DIR, file);
    }
  }
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const filePath = await findOperatorFile(id);

    if (!filePath) {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }

    const content = await readFile(filePath, "utf-8");
    return NextResponse.json({ yaml: content });
  } catch (error) {
    console.error("Failed to get operator:", error);
    return NextResponse.json({ error: "Failed to get operator" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { yaml: yamlContent } = body;

    if (!yamlContent || typeof yamlContent !== "string") {
      return NextResponse.json({ error: "YAML content is required" }, { status: 400 });
    }

    let config;
    try {
      config = parse(yamlContent);
    } catch {
      return NextResponse.json({ error: "Invalid YAML syntax" }, { status: 400 });
    }

    const errors = validateOperator(config);
    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    // Prevent ID changes
    if (config.id !== id) {
      return NextResponse.json(
        { error: "Cannot change operator ID" },
        { status: 400 }
      );
    }

    const filePath = await findOperatorFile(id);
    if (!filePath) {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }

    await writeFile(filePath, yamlContent, "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update operator:", error);
    return NextResponse.json({ error: "Failed to update operator" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const filePath = await findOperatorFile(id);

    if (!filePath) {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }

    await unlink(filePath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete operator:", error);
    return NextResponse.json({ error: "Failed to delete operator" }, { status: 500 });
  }
}
