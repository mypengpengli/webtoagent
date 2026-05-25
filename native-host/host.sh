#!/bin/sh

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
NODE_BIN=""

if [ -f "$SCRIPT_DIR/.node-path" ]; then
  NODE_BIN="$(cat "$SCRIPT_DIR/.node-path" 2>/dev/null)"
fi

if [ -z "$NODE_BIN" ] || [ ! -x "$NODE_BIN" ]; then
  export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
  NODE_BIN="$(command -v node 2>/dev/null)"
fi

if [ -z "$NODE_BIN" ]; then
  exit 127
fi

exec "$NODE_BIN" "$SCRIPT_DIR/host.js"
