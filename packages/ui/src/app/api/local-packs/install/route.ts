import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  installPackBundleAsOperator,
  savePackBundle,
  validatePackBundle,
  type PackBundle,
} from "@operator/core";
import { checkRateLimit, getClientId, RATE_LIMITS } from "@/lib/rate-limit";
import { findProjectRoot, getPackRegistryDirs } from "@/lib/packs";

const installSchema = z.object({
  bundle: z.object({
    manifest: z.unknown(),
    operatorYaml: z.string().min(1),
    readme: z.string().optional(),
    fixtureContext: z.unknown().optional(),
  }),
});

export async function POST(request: NextRequest) {
  const clientId = getClientId(request);
  const rateLimit = checkRateLimit(`local-packs:install:${clientId}`, RATE_LIMITS.packs);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before installing another local pack." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = installSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join("; ") },
        { status: 400 }
      );
    }

    const bundle: PackBundle = {
      manifest: parsed.data.bundle.manifest as PackBundle["manifest"],
      operatorYaml: parsed.data.bundle.operatorYaml,
      readme: parsed.data.bundle.readme,
      fixtureContext: parsed.data.bundle.fixtureContext,
    };

    const validation = validatePackBundle(bundle);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Invalid local pack bundle", details: validation.errors },
        { status: 400 }
      );
    }

    const projectRoot = findProjectRoot();
    const { localDir, localOperatorsDir } = getPackRegistryDirs(projectRoot);
    const savedPath = await savePackBundle(bundle, localDir);
    const installed = await installPackBundleAsOperator(bundle, localOperatorsDir);

    return NextResponse.json(
      {
        success: true,
        pack: {
          id: bundle.manifest.id,
          name: bundle.manifest.name,
          version: bundle.manifest.version,
        },
        savedPath,
        operator: installed,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to install local pack";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
