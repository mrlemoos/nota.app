#!/bin/sh
# Railway / Railpack: npm ci removes existing node_modules first. Astro leaves
# paths under apps/nota-marketing/node_modules/.astro that can be busy on
# overlay filesystems, causing EBUSY on rmdir. Clearing workspace trees first
# avoids that race.
set -eu
rm -rf node_modules apps/*/node_modules
npm ci
cd apps/nota-server
npm run build
