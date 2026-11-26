# Zara AI – Google Play Store Android App Bundle (.aab), Accessibility & Custom Wake-Word Guide

This guide covers building, signing, and publishing the production **Android App Bundle (`.aab`)** for **Zara AI (`com.zara.ai.assistant`)**, including the native **Accessibility Service** (`ZaraAccessibilityService`), **Low-Power Custom Wake Word Engine** (`ZaraWakeWordService`), and **Digital Asset Links** setup.

---

## 1. Included Native Android Modules (`/android`)

All native Kotlin components are pre-configured in `/android/app/src/main/java/com/zara/ai/assistant/`:

- **`MainActivity.kt`**: Full-screen WebView + JavaScript bridge (`window.ZaraAndroidBridge`), live screen reading & UI button/scroll/text actions, dynamic PackageManager app launching, OS settings launchers (`Wi-Fi`, `Bluetooth`, `Display`, `Sound`, `Battery`, `Accessibility`, `Notifications`), runtime permission requests (`RECORD_AUDIO`, `CAMERA`, `ACCESS_FINE_LOCATION`, `CALL_PHONE`, `READ_CONTACTS`, `SEND_SMS`, `POST_NOTIFICATIONS`), and Google Sign-In / Play Billing handling.
- **`ZaraAccessibilityService.kt`**: User-enabled Accessibility Service allowing screen reading & AI explanation, clicking buttons by voice label, scrolling/swiping (`down`, `up`, `left`, `right`), typing text into focused inputs, OS navigation (`back`, `home`, `recents`, `notifications`, `screenshot`, `lock_screen`), and confirmed Send actions. Password fields (`isPassword`) are strictly redacted/ignored.
- **`ZaraNotificationListener.kt`**: Official `NotificationListenerService` that appears under Android **Settings → Notifications → Notification access** as **"Zara Notification Assistant"** and reads incoming/active WhatsApp, WhatsApp Business, Telegram, Messenger, SMS, and Call notifications with automatic OTP masking.
- **`ZaraWakeWordService.kt`**: 16kHz adaptive Voice Activity Detection (VAD) foreground microphone listener that stays low-power during silence and wakes Zara on your custom wake phrase (default `"hey zara"`), even from background or lock screen where Android permits.
- **`ZaraForegroundVoiceService.kt`**: Persistent Android 14+ foreground microphone notification channel so OS battery savers do not kill voice listening.
- **`ZaraBootReceiver.kt`** & **`ZaraPlayBillingManager.kt`**: Boot restore receiver and Play Billing v7 subscription client.

---

## 2. Building an Installable Android `.apk` (for Infinix SMART 9 / Direct Install) or `.aab`

> **Prerequisites (Local Machine or CI Runner with Android SDK):**
> - JDK 17+
> - Android SDK Platform 35 + Build Tools 35
> - Android Studio (recommended) **or** Gradle 8.9 CLI

### Build Signed Installable APK (CLI)
```bash
cd android
chmod +x build-release-apk.sh
./build-release-apk.sh
# Output APK: android/app/build/outputs/apk/release/app-release.apk
# Install over USB debugging on Infinix SMART 9:
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

### Option A: Android Studio (APK or AAB)
1. Open the `/android` folder in **Android Studio** (or download the complete ZIP from inside Zara).
2. Wait for Gradle Sync to complete.
3. For direct phone installation (Infinix SMART 9): click **Build → Build Bundle(s) / APK(s) → Build APK(s)** (or **Generate Signed Bundle / APK → APK**).
4. For Google Play Store: click **Build → Generate Signed Bundle / APK... → Android App Bundle** (`android/app/build/outputs/bundle/release/app-release.aab`).

### Infinix SMART 9 (XOS 14 / Android 14) Recommended Permissions After Installing APK
1. **Accessibility**: `Settings → Special function → Accessibility → Installed apps → Zara AI Hands-Free Control → ON`.
2. **Notification Access**: `Settings → Notifications → Notification access → Zara Notification Assistant → ON`.
3. **Background / Lock Screen Voice**: `Phone Master / Settings → Battery → App power consumption → Zara AI → Unrestricted` + enable `Auto-start` in Phone Master so XOS does not kill Zara when the screen locks.
4. **Runtime Permissions**: Grant Microphone, Camera, Phone, Contacts, and Notifications when prompted inside Zara.

### Option B: Play Store AAB Command Line Script (`build-play-aab.sh`)
```bash
cd android
chmod +x build-play-aab.sh
export ZARA_KEYSTORE_PASSWORD="YOUR_STRONG_PASSWORD"
export ZARA_KEY_PASSWORD="YOUR_STRONG_PASSWORD"
export ZARA_KEY_ALIAS="zara_release"
./build-play-aab.sh
```

### Option C: Zero-Setup Cloud APK & AAB Build (GitHub Actions)
This repository includes `.github/workflows/build-android-apk.yml`:
1. Push the exported project (or `/android` + `.github/workflows/build-android-apk.yml`) to a GitHub repository.
2. Open the **Actions** tab → **Build Zara AI Android APK & Play Store AAB** → **Run workflow**.
3. Download `zara-android-builds.zip` containing `app-debug.apk`, `app-release.apk`, and `app-release.aab` — no local Android Studio installation required.

### Option D: Direct Build on Android Phone via Termux (`build-termux-apk.sh`)
If you are building directly on your Android phone using **Termux**:
1. Download `Zara-Complete-Project-A-to-Z.zip` (or `Zara-AI-Android-Studio-Project.zip`).
2. In Termux, run:
```bash
termux-setup-storage
mkdir -p ~/zara-app && cd ~/zara-app
unzip ~/storage/downloads/Zara-Complete-Project-A-to-Z.zip
bash android/build-termux-apk.sh release
```
3. `build-termux-apk.sh` automatically installs `openjdk-17`, `gradle`, `aapt2`, `wget`, `unzip`, sets up Android SDK Platform 35, generates `zara-release.keystore`, passes `-Pandroid.aapt2FromMavenOverride=$PREFIX/bin/aapt2` (so ARM64 builds never hit `aapt2` x86_64 format errors), and saves `Zara-AI-app-release.apk` into `~/storage/downloads/`.
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
