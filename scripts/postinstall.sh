#!/bin/sh
# Fix: @tailwindcss/node bundles its own lightningcss@1.31.1 but npm doesn't
# install the native binary for nested optional deps. Copy from top-level.
SRC="node_modules/lightningcss-darwin-arm64"
DST="node_modules/@tailwindcss/node/node_modules/lightningcss-darwin-arm64"
if [ -d "$SRC" ] && [ ! -f "$DST/lightningcss.darwin-arm64.node" ]; then
  mkdir -p "$DST"
  cp "$SRC"/* "$DST/"
  echo "postinstall: copied lightningcss binary to @tailwindcss/node"
fi
