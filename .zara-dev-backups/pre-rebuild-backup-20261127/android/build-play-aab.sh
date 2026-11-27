#!/usr/bin/env bash
set -euo pipefail

# Zara AI — Google Play Store Signed Android App Bundle (.aab) Builder
# Builds com.zara.ai.assistant with AccessibilityService & Low-Power Custom Wake Word Service.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${SCRIPT_DIR}/app"
KEYSTORE_FILE="${APP_DIR}/zara-release.keystore"
KEY_ALIAS="${ZARA_KEY_ALIAS:-zara_release}"
STORE_PASS="${ZARA_KEYSTORE_PASSWORD:-zara_ai_2026_secure}"
KEY_PASS="${ZARA_KEY_PASSWORD:-zara_ai_2026_secure}"

echo "=== Zara AI Play Store (.aab) Build Script ==="

for cmd in java keytool; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: '$cmd' not found. Install JDK 17+ and Android SDK (or open /android in Android Studio)."
    exit 1
  fi
done

if [ ! -f "$KEYSTORE_FILE" ]; then
  echo "Generating release keystore at ${KEYSTORE_FILE}..."
  keytool -genkeypair -v \
    -keystore "$KEYSTORE_FILE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass "$STORE_PASS" \
    -keypass "$KEY_PASS" \
    -dname "CN=Zara AI, OU=AI Studio, O=Zara Systems, L=Kuala Lumpur, ST=Federal Territory, C=MY"
fi

echo "Extracting SHA-256 certificate fingerprint (verify against public/.well-known/assetlinks.json)..."
keytool -list -v -keystore "$KEYSTORE_FILE" -alias "$KEY_ALIAS" -storepass "$STORE_PASS" | grep -E "SHA256:" || true

cd "$SCRIPT_DIR"
if [ -x "./gradlew" ]; then
  GRADLE_BIN="./gradlew"
elif command -v gradle >/dev/null 2>&1; then
  GRADLE_BIN="gradle"
else
  echo "NOTICE: ./gradlew wrapper JAR not present and global 'gradle' not installed."
  echo "Open the '/android' folder in Android Studio -> Build -> Generate Signed Bundle / APK -> Android App Bundle (.aab)"
  echo "Or initialize the wrapper with: gradle wrapper --gradle-version 8.9 && ./gradlew clean bundleRelease"
  exit 1
fi

export ZARA_KEYSTORE_PASSWORD="$STORE_PASS"
export ZARA_KEY_ALIAS="$KEY_ALIAS"
export ZARA_KEY_PASSWORD="$KEY_PASS"

echo "Building signed Play Store App Bundle (bundleRelease)..."
"$GRADLE_BIN" clean bundleRelease

AAB_PATH="${APP_DIR}/build/outputs/bundle/release/app-release.aab"
if [ -f "$AAB_PATH" ]; then
  echo ""
  echo "SUCCESS! Play Store AAB generated at:"
  echo "  ${AAB_PATH}"
  echo ""
  echo "Google Play Console Reminder:"
  echo "  1. Upload app-release.aab to Production or Internal/Closed Testing."
  echo "  2. In App Content -> Accessibility API declaration, describe ZaraAccessibilityService"
  echo "     as a user-initiated hands-free voice navigation & screen-reading assistant."
  echo "  3. Add your Play App Signing SHA-256 fingerprint to public/.well-known/assetlinks.json."
fi
