#!/bin/sh
set -eu

HOST_NAME="com.webtoagent.host"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
NATIVE_DIR="$SCRIPT_DIR/native-host"
HOST_SCRIPT="$NATIVE_DIR/host.sh"
HOST_JS="$NATIVE_DIR/host.js"
NODE_PATH_FILE="$NATIVE_DIR/.node-path"

echo ""
echo "========================================"
echo "  WebToAgent - Native Host Install"
echo "========================================"
echo ""
echo "Before continuing:"
echo "  1. Open chrome://extensions"
echo "  2. Enable Developer mode"
echo "  3. Load this project folder as an unpacked extension"
echo "  4. Copy the extension ID"
echo ""

printf "Paste extension ID: "
read EXTENSION_ID
EXTENSION_ID="$(printf "%s" "$EXTENSION_ID" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"

case "$EXTENSION_ID" in
  [a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p][a-p]) ;;
  *)
    echo ""
    echo "Invalid extension ID. It should be 32 letters using a-p." >&2
    exit 1
    ;;
esac

if [ ! -f "$HOST_JS" ]; then
  echo "Cannot find native host file: $HOST_JS" >&2
  exit 1
fi

NODE_BIN="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE_BIN" ]; then
  echo ""
  echo "Warning: Node.js was not found in this terminal."
  echo "Install Node.js v14+, then run this installer again."
  exit 1
fi

printf "%s\n" "$NODE_BIN" > "$NODE_PATH_FILE"
chmod +x "$HOST_SCRIPT"

json_escape() {
  printf "%s" "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

HOST_SCRIPT_JSON="$(json_escape "$HOST_SCRIPT")"
ORIGIN_JSON="$(json_escape "chrome-extension://$EXTENSION_ID/")"

write_manifest() {
  TARGET_DIR="$1"
  mkdir -p "$TARGET_DIR"
  MANIFEST_PATH="$TARGET_DIR/$HOST_NAME.json"
  cat > "$MANIFEST_PATH" <<EOF
{
  "name": "$HOST_NAME",
  "description": "WebToAgent native messaging host",
  "path": "$HOST_SCRIPT_JSON",
  "type": "stdio",
  "allowed_origins": ["$ORIGIN_JSON"]
}
EOF
  echo "Wrote: $MANIFEST_PATH"
}

echo ""
echo "[1/3] Writing native host manifests..."
write_manifest "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
write_manifest "$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts"
write_manifest "$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
write_manifest "$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"

echo "[2/3] Checking Node.js..."
node -v

echo "[3/3] Done."
echo ""
echo "Install complete."
echo "Next steps:"
echo "  1. Restart Chrome"
echo "  2. Open a supported AI website"
echo "  3. Click the file button or press Ctrl+Shift+F"
