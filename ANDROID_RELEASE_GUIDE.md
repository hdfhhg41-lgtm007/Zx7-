# Zara AI – Google Play Store Android App Bundle (.aab), Accessibility & Custom Wake-Word Guide

This guide covers building, signing, and publishing the production **Android App Bundle (`.aab`)** for **Zara AI (`com.zara.ai.assistant`)**, including the native **Accessibility Service** (`ZaraAccessibilityService`), **Low-Power Custom Wake Word Engine** (`ZaraWakeWordService`), and **Digital Asset Links** setup.

---

## 1. Included Native Android Modules (`/android`)

All native Kotlin components are pre-configured in `/android/app/src/main/java/com/zara/ai/assistant/`:

- **`MainActivity.kt`**: Full-screen WebView + JavaScript bridge (`window.ZaraAndroidBridge`), runtime permission requests (`RECORD_AUDIO`, `CAMERA`, `ACCESS_FINE_LOCATION`, `POST_NOTIFICATIONS`), and Google Sign-In / deep-link handling.
- **`ZaraAccessibilityService.kt`**: User-enabled Accessibility Service allowing hands-free cross-app actions (`back`, `home`, `recents`, `scroll_down`, `lock_screen`, confirmed element clicks). Password fields (`isPassword`) are ignored for user privacy.
- **`ZaraWakeWordService.kt`**: 16kHz adaptive Voice Activity Detection (VAD) foreground microphone listener that stays low-power during silence and wakes Zara on your custom wake phrase (default `"hey zara"`, customizable in Settings).
- **`ZaraForegroundVoiceService.kt`**: Persistent Android 14+ foreground microphone notification channel so OS battery savers do not kill voice listening.
- **`ZaraNotificationListener.kt`**: Spoken notification announcement bridge with OTP/sensitive-data masking.

---

## 2. Building the Signed Play Store `.aab`

> **Prerequisites (Local Machine or CI Runner with Android SDK):**
> - JDK 17+
> - Android SDK Platform 35 + Build Tools 35
> - Android Studio (recommended) **or** Gradle 8.9 CLI

### Option A: Android Studio (Fastest)
1. Open the `/android` folder in **Android Studio**.
2. Wait for Gradle Sync to complete.
3. Click **Build → Generate Signed Bundle / APK... → Android App Bundle**.
4. Select or create `app/zara-release.keystore` (`alias: zara_release`).
5. Choose **release** build variant — output is saved at:
   `android/app/build/outputs/bundle/release/app-release.aab`

### Option B: Command Line Script (`build-play-aab.sh`)
```bash
cd android
chmod +x build-play-aab.sh
# Optional: supply custom keystore credentials via environment variables
export ZARA_KEYSTORE_PASSWORD="YOUR_STRONG_PASSWORD"
export ZARA_KEY_PASSWORD="YOUR_STRONG_PASSWORD"
export ZARA_KEY_ALIAS="zara_release"
./build-play-aab.sh
```
If Gradle CLI is installed without a wrapper JAR yet, run once inside `/android`:
```bash
gradle wrapper --gradle-version 8.9
./gradlew clean bundleRelease
```

---

## 3. Signing & Digital Asset Links Verification

Generate a release keystore manually (if not using `build-play-aab.sh`):
```bash
keytool -genkeypair -v \
  -keystore android/app/zara-release.keystore \
  -alias zara_release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=Zara AI, OU=AI Studio, O=Zara Systems, L=Kuala Lumpur, ST=Federal Territory, C=MY"
```

Check the SHA-256 fingerprint:
```bash
keytool -list -v -keystore android/app/zara-release.keystore -alias zara_release
```
Add your Play App Signing SHA-256 fingerprint from **Google Play Console → Setup → App integrity** into `public/.well-known/assetlinks.json` and `android/app/build.gradle` (`assetStatements`) so Android verifies the domain and removes browser chrome.

---

## 4. Google Play Console Submission Checklist

1. **Upload `.aab`**: Upload `android/app/build/outputs/bundle/release/app-release.aab` to Internal Testing, Closed Testing, or Production.
2. **Accessibility API Declaration** (Required by Google Play):
   - In **Play Console → App content → Accessibility**, declare that `ZaraAccessibilityService` is an explicit, opt-in hands-free voice navigation assistant helping users operate apps without touch, and never collects passwords or private form inputs.
3. **Foreground Service Types**:
   - Manifest declares `android:foregroundServiceType="microphone"` and `"mediaPlayback"` for continuous Assistant ON/OFF voice listening.
4. **Permissions Used**:
   - `RECORD_AUDIO` · `CAMERA` · `ACCESS_FINE_LOCATION` · `POST_NOTIFICATIONS` · `FOREGROUND_SERVICE_MICROPHONE` · `WAKE_LOCK` · `BIND_ACCESSIBILITY_SERVICE` · `BIND_NOTIFICATION_LISTENER_SERVICE`
5. **Privacy Policy**:
   - Declare clearly that Normal/Guest sessions remain ephemeral while verified Owner data is gated behind Google Sign-In.
