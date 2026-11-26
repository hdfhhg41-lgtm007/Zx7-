#!/usr/bin/env bash
set -euo pipefail

# Zara AI — Signed Release & Debug APK Builder for Android (Infinix SMART 9 / XOS & All Android 7–15)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${SCRIPT_DIR}/app"
KEYSTORE_FILE="${APP_DIR}/zara-release.keystore"
KEY_ALIAS="${ZARA_KEY_ALIAS:-zara_release}"
STORE_PASS="${ZARA_KEYSTORE_PASSWORD:-zara_ai_2026_secure}"
KEY_PASS="${ZARA_KEY_PASSWORD:-zara_ai_2026_secure}"

echo "=== Zara AI Android APK Build Script ==="

for cmd in java keytool; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: '$cmd' not found. Install JDK 17+ and Android SDK Platform 35 (or open /android in Android Studio)."
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

cd "$SCRIPT_DIR"
if [ -f "./gradlew" ]; then
  chmod +x ./gradlew 2>/dev/null || true
fi

if [ -x "./gradlew" ]; then
  GRADLE_BIN="./gradlew"
elif command -v gradle >/dev/null 2>&1; then
  GRADLE_BIN="gradle"
else
  echo "ERROR: Neither ./gradlew nor global 'gradle' found. Open /android in Android Studio -> Build -> Build APK(s)."
  exit 1
fi

export ZARA_KEYSTORE_PASSWORD="$STORE_PASS"
export ZARA_KEY_ALIAS="$KEY_ALIAS"
export ZARA_KEY_PASSWORD="$KEY_PASS"

AAPT2_ARG=""
if { [ -n "${TERMUX_VERSION:-}" ] || [ -d "/data/data/com.termux/files/usr" ]; } && command -v aapt2 >/dev/null 2>&1; then
  AAPT2_ARG="-Pandroid.aapt2FromMavenOverride=$(command -v aapt2)"
  echo "Termux detected: using native aapt2 override ($AAPT2_ARG)"
fi

BUILD_TARGET="${1:-both}"
GRADLE_FLAGS="--no-daemon --max-workers=2"

if [ "$BUILD_TARGET" = "debug" ]; then
  echo "Building installable Debug APK (low-memory mode)..."
  "$GRADLE_BIN" $GRADLE_FLAGS $AAPT2_ARG assembleDebug
  APK_OUT="${APP_DIR}/build/outputs/apk/debug/app-debug.apk"
elif [ "$BUILD_TARGET" = "release" ]; then
  echo "Building signed Release APK (low-memory mode)..."
  "$GRADLE_BIN" $GRADLE_FLAGS $AAPT2_ARG clean assembleRelease
  APK_OUT="${APP_DIR}/build/outputs/apk/release/app-release.apk"
else
  echo "Building BOTH Debug and signed Release APKs sequentially (low-memory mode)..."
  "$GRADLE_BIN" $GRADLE_FLAGS $AAPT2_ARG clean assembleDebug
  "$GRADLE_BIN" $GRADLE_FLAGS $AAPT2_ARG assembleRelease
  APK_OUT="${APP_DIR}/build/outputs/apk/release/app-release.apk"
fi

echo ""
for CAND in \
  "${APP_DIR}/build/outputs/apk/debug/app-debug.apk" \
  "${APP_DIR}/build/outputs/apk/release/app-release.apk"; do
  if [ -f "$CAND" ]; then
    echo "SUCCESS! Installable APK ready at: ${CAND}"
  fi
done

if [ -f "$APK_OUT" ] && command -v adb >/dev/null 2>&1; then
  echo ""
  echo "Connected ADB devices:"
  adb devices -l || true
  echo "To install over USB debugging, run:"
  echo "  adb install -r \"${APK_OUT}\""
fi
