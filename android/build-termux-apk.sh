#!/usr/bin/env bash
set -euo pipefail

# Zara AI — Complete Termux (Android ARM64 / aarch64) APK Builder
# Builds Debug & Signed Release APKs directly on your Android phone via Termux.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${SCRIPT_DIR}/app"
SDK_DIR="${ANDROID_HOME:-${HOME}/android-sdk}"
KEYSTORE_FILE="${APP_DIR}/zara-release.keystore"
KEY_ALIAS="${ZARA_KEY_ALIAS:-zara_release}"
STORE_PASS="${ZARA_KEYSTORE_PASSWORD:-zara_ai_2026_secure}"
KEY_PASS="${ZARA_KEY_PASSWORD:-zara_ai_2026_secure}"

echo "=== Zara AI Termux Android APK Builder ==="

# 1. Install required Termux packages if running inside Termux
if [ -n "${TERMUX_VERSION:-}" ] || [ -d "/data/data/com.termux/files/usr" ]; then
  MISSING_PKGS=""
  for cmd_pkg in "java:openjdk-17" "gradle:gradle" "aapt2:aapt2" "wget:wget" "unzip:unzip"; do
    cmd="${cmd_pkg%%:*}"
    pkg="${cmd_pkg##*:}"
    if ! command -v "$cmd" >/dev/null 2>&1; then
      MISSING_PKGS="$MISSING_PKGS $pkg"
    fi
  done
  if [ -n "$MISSING_PKGS" ]; then
    echo "Installing Termux packages:$MISSING_PKGS"
    pkg update -y
    pkg install -y $MISSING_PKGS
  fi
fi

# 2. Ensure Android SDK (Platform 35 + Build Tools 35.0.0) exists
if [ ! -d "${SDK_DIR}/platforms/android-35" ] || [ ! -d "${SDK_DIR}/build-tools/35.0.0" ]; then
  echo "Setting up Android SDK at ${SDK_DIR}..."
  mkdir -p "${SDK_DIR}/cmdline-tools"
  if [ ! -x "${SDK_DIR}/cmdline-tools/latest/bin/sdkmanager" ]; then
    CMDLINE_ZIP="${HOME}/commandlinetools-linux.zip"
    wget -q --show-progress -O "$CMDLINE_ZIP" \
      "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
    TMP_UNZIP="${HOME}/_zara_cmdline_tmp"
    rm -rf "$TMP_UNZIP"
    unzip -q "$CMDLINE_ZIP" -d "$TMP_UNZIP"
    rm -rf "${SDK_DIR}/cmdline-tools/latest"
    mv "${TMP_UNZIP}/cmdline-tools" "${SDK_DIR}/cmdline-tools/latest"
    rm -rf "$TMP_UNZIP" "$CMDLINE_ZIP"
  fi
  export ANDROID_HOME="${SDK_DIR}"
  export ANDROID_SDK_ROOT="${SDK_DIR}"
  yes | "${SDK_DIR}/cmdline-tools/latest/bin/sdkmanager" --sdk_root="${SDK_DIR}" --licenses >/dev/null || true
  "${SDK_DIR}/cmdline-tools/latest/bin/sdkmanager" --sdk_root="${SDK_DIR}" \
    "platform-tools" "platforms;android-35" "build-tools;35.0.0"
fi

export ANDROID_HOME="${SDK_DIR}"
export ANDROID_SDK_ROOT="${SDK_DIR}"
printf 'sdk.dir=%s\n' "$SDK_DIR" > "${SCRIPT_DIR}/local.properties"
echo "Configured android/local.properties -> ${SDK_DIR}"

# 3. Generate release keystore automatically if missing
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

# 4. Detect Termux ARM64 aapt2 override (prevents x86_64 Exec format error)
AAPT2_ARG=""
if command -v aapt2 >/dev/null 2>&1; then
  AAPT2_BIN="$(command -v aapt2)"
  AAPT2_ARG="-Pandroid.aapt2FromMavenOverride=${AAPT2_BIN}"
  echo "Using native ARM64 aapt2: ${AAPT2_BIN}"
fi

cd "$SCRIPT_DIR"
GRADLE_BIN="gradle"
if ! command -v gradle >/dev/null 2>&1 && [ -f "./gradlew" ]; then
  chmod +x ./gradlew || true
  GRADLE_BIN="./gradlew"
fi

export ZARA_KEYSTORE_PASSWORD="$STORE_PASS"
export ZARA_KEY_ALIAS="$KEY_ALIAS"
export ZARA_KEY_PASSWORD="$KEY_PASS"

BUILD_TARGET="${1:-release}"
GRADLE_FLAGS="--no-daemon --max-workers=2"

if [ "$BUILD_TARGET" = "debug" ]; then
  echo "Building Debug APK in Termux..."
  "$GRADLE_BIN" $GRADLE_FLAGS $AAPT2_ARG assembleDebug
elif [ "$BUILD_TARGET" = "both" ]; then
  echo "Building BOTH Debug & Signed Release APKs in Termux..."
  "$GRADLE_BIN" $GRADLE_FLAGS $AAPT2_ARG clean assembleDebug
  "$GRADLE_BIN" $GRADLE_FLAGS $AAPT2_ARG assembleRelease
else
  echo "Building Signed Release APK in Termux..."
  "$GRADLE_BIN" $GRADLE_FLAGS $AAPT2_ARG assembleRelease
fi

echo ""
for CAND in \
  "${APP_DIR}/build/outputs/apk/release/app-release.apk" \
  "${APP_DIR}/build/outputs/apk/debug/app-debug.apk"; do
  if [ -f "$CAND" ]; then
    echo "SUCCESS! APK built at: ${CAND}"
    if [ -d "${HOME}/storage/downloads" ]; then
      OUT_NAME="Zara-AI-$(basename "$CAND")"
      cp "$CAND" "${HOME}/storage/downloads/${OUT_NAME}"
      echo "Copied to Phone Downloads: ~/storage/downloads/${OUT_NAME}"
    fi
  fi
done
