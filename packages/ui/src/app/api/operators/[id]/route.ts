import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, unlink, readdir } from "fs/promises";
import { parse } from "yaml";
import { join } from "path";
import { validateOperator } from "@/lib/operatorSchema";
import { checkRateLimit, getClientId, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const BASE_OPERATORS_DIR = join(process.cwd(), "..", "..", "config", "operators");
const OPERATORS_DIRS = [
  join(BASE_OPERATORS_DIR, "local"),
  join(BASE_OPERATORS_DIR, "examples"),
];

// Maximum file size for operator YAML (100KB)
const MAX_FILE_SIZE = 100 * 1024;

// Safe ID pattern - only lowercase letters, numbers, and hyphens
const SAFE_ID_PATTERN = /^[a-z0-9-]+$/;

// Schema for operator update request
const updateOperatorSchema = z.object({
  yaml: z
    .string()
    .min(1, "YAML content is required")
    .max(MAX_FILE_SIZE, `YAML content too large (max ${MAX_FILE_SIZE / 1024}KB)`),
});

async function findOperatorFile(id: string): Promise<string | null> {
  for (const dir of OPERATORS_DIRS) {
    try {
      const files = await readdir(dir);
      for (const file of files) {
        if (!file.endsWith(".yaml") && !file.endsWith(".yml")) continue;
        const filePath = join(dir, file);
        const content = await readFile(filePath, "utf-8");
        const config = parse(content);
        if (config.id === id) {
          return filePath;
        }
      }
    } catch {
      // Directory doesn't exist, continue to next
      continue;
    }
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID to prevent path traversal
    if (!SAFE_ID_PATTERN.test(id)) {
      return NextResponse.json(
        { error: "Invalid operator ID format" },
        { status: 400 }
      );
    }

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limiting
  const clientId = getClientId(request);
  const rateLimit = checkRateLimit(`operators:${clientId}`, RATE_LIMITS.operators);

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please wait before updating.",
        retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
      },
      { status: 429 }
    );
  }

  try {
    const { id } = await params;

    // Validate ID to prevent path traversal
    if (!SAFE_ID_PATTERN.test(id)) {
      return NextResponse.json(
        { error: "Invalid operator ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body with Zod schema
    const validation = updateOperatorSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message);
      return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
    }

    const { yaml: yamlContent } = validation.data;

    // Check actual byte size
    const byteSize = new TextEncoder().encode(yamlContent).length;
    if (byteSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Content too large. Maximum size is ${MAX_FILE_SIZE / 1024}KB.` },
        { status: 400 }
      );
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limiting
  const clientId = getClientId(request);
  const rateLimit = checkRateLimit(`operators:${clientId}`, RATE_LIMITS.operators);

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please wait before deleting.",
        retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
      },
      { status: 429 }
    );
  }

  try {
    const { id } = await params;

    // Validate ID to prevent path traversal
    if (!SAFE_ID_PATTERN.test(id)) {
      return NextResponse.json(
        { error: "Invalid operator ID format" },
        { status: 400 }
      );
    }

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
