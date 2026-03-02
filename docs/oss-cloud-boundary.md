# OSS and Cloud Boundary

This repo is the OSS engine surface. It intentionally includes local mechanics and excludes hosted distribution/trust/growth features.

## OSS responsibilities

- Workflow and pack schema contracts
- Runtime execution mechanics
- Connector abstraction and local execution
- Local pack validation, install, and fixture demo run
- CLI and local developer tooling

## Private cloud responsibilities

- User auth, tenant/workspace controls, billing
- Pack discovery and sharing links
- Registry indexing, moderation, trust scoring, verification
- Growth loops (feeds, recommendations, creator analytics)
- Abuse prevention and compliance controls

## Current OSS pack endpoints

- `POST /api/local-packs/install`
- `POST /api/local-packs/demo-run`

Both endpoints accept direct bundle payloads and do not fetch remote URLs or expose discovery primitives.

## Compatibility with operator-cloud

The `operator-cloud` repository already follows the right split pattern:

- `oss/` sub-tree for public engine
- `packages/server` and `packages/app` for private hosted product

Adoption strategy:

1. Keep pack schema and validation logic in OSS core.
2. Implement hosted pack registry APIs only in cloud server.
3. Keep local `/api/local-packs/*` in OSS as a reference and dev fallback.
4. In cloud UI, call private server routes for import/share/discover while preserving the same pack bundle contract.
