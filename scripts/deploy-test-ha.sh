#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HA_CONFIG_DIR="${HA_CONFIG_DIR:-/Volumes/config}"
TARGET_DIR="${TARGET_DIR:-${HA_CONFIG_DIR}/www/community/ha-hrv-card}"
SOURCE_FILE="${ROOT_DIR}/ha-hrv-card.js"
TARGET_FILE="${TARGET_DIR}/ha-hrv-card.js"

if [[ ! -f "${SOURCE_FILE}" ]]; then
  echo "Missing ${SOURCE_FILE}" >&2
  exit 1
fi

mkdir -p "${TARGET_DIR}"
cp "${SOURCE_FILE}" "${TARGET_FILE}"

VERSION="$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "${ROOT_DIR}/package.json" | head -n 1)"
CACHE_BUSTER="$(date +%Y%m%d%H%M%S)"

echo "Copied ${SOURCE_FILE}"
echo "To     ${TARGET_FILE}"
echo
echo "Use this resource URL in the test Home Assistant if cache needs busting:"
echo "/local/community/ha-hrv-card/ha-hrv-card.js?v=${VERSION}-${CACHE_BUSTER}"
