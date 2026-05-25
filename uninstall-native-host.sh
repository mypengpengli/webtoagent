#!/bin/sh
set -eu

HOST_NAME="com.webtoagent.host"

remove_manifest() {
  MANIFEST_PATH="$1/$HOST_NAME.json"
  if [ -f "$MANIFEST_PATH" ]; then
    rm -f "$MANIFEST_PATH"
    echo "Removed: $MANIFEST_PATH"
  fi
}

remove_manifest "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
remove_manifest "$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts"
remove_manifest "$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
remove_manifest "$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"

echo "WebToAgent native host uninstalled."
