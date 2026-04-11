#!/bin/sh
# Optional local / custom CI helper (full monorepo install + bundle).
# Railway production uses infra/Dockerfile.nota-server instead — Railpack leaves
# node_modules/.cache and .astro busy, so rm/npm ci can fail there.
set -eu
npm ci
cd apps/nota-server
npm run build
