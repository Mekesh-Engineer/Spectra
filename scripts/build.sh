#!/usr/bin/env bash
set -e

echo "Building Spectra for production..."

npm run typecheck
npm run build

echo "Build complete. Output in dist/"
