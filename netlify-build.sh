#!/usr/bin/env bash
set -euo pipefail

if [[ -n "${URL:-}" ]]; then
    npm run build -- --html-url-extension-style=indexify --url "$URL"
else
    npm run build -- --html-url-extension-style=indexify
fi
