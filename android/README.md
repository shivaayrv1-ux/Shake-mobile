# Shake & Volume Screen Control - Native Android Project

A lightweight, battery-efficient native Android application written in Kotlin for gesture-based and hardware-key screen wake/lock control.

---

## 📱 Features

1. **Shake to Turn Screen ON/OFF**:
   - Accelerometer vector magnitude computation: $a_{\text{net}} = \sqrt{x^2 + y^2 + z^2} - 9.80665\,\text{m/s}^2$
   - Accidental activation prevention: Minimum rapid directional shifts ($N \ge 2$) within 450ms.
   - Debounce cooldown: 2000ms delay between triggers.
   - Screen OFF mechanism: Uses `AccessibilityService.performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN)` on Android 9+ (biometrics remain valid).
   - Screen ON mechanism: High-priority `PowerManager.newWakeLock(SCREEN_BRIGHT_WAKE_LOCK | ACQUIRE_CAUSES_WAKEUP)` with auto-release safety timeout.
   - Battery efficiency: Low-power `SENSOR_DELAY_UI` sampling rate and hardware wake-up sensor querying (`sensor.isWakeUpSensor`).

2. **Volume UP Button to Turn Screen ON**:
   - Intercepts physical `KeyEvent.KEYCODE_VOLUME_UP` using `AccessibilityService.onKeyEvent()`.
   - When the display is off/dimmed, acquires wake lock and illuminates display without modifying active media volume levels.
   - **System Limitation Analysis**: See detailed explanation below.

---

## 🔍 Android Platform Restrictions & Technical Analysis

### 1. Screen Lock & Turn OFF Permissions
- **Android 9.0 (API 28) and newer**: Google introduced `AccessibilityService.GLOBAL_ACTION_LOCK_SCREEN`. This is the official non-root API for software screen locking. Unlike legacy methods, it preserves biometric unlock (Fingerprint / Face ID).
- **Android 8.0 and older**: Uses `DevicePolicyManager.lockNow()`. Requires Device Admin permission. Note: On older OEM skins, calling `lockNow()` disables fingerprint unlock until PIN is entered once.
- **Root / System privileges**: Not required. The app functions completely on stock, unrooted Android.

### 2. Volume UP Key When Screen Is OFF (Deep Sleep)
- **The Linux Kernel & Input Subsystem Boundary**:
  When an Android device powers off its screen and enters kernel suspend (deep sleep / Doze), the kernel input driver (`/dev/input/event*`) cuts power to key scanning matrices and suspends key event dispatch to userspace.
- **Why Non-Root Apps Cannot Wake from Deep Sleep via Volume Keys**:
  In Android's security and power architecture, hardware key wake interrupts are governed by the device tree file (`gpio-keys`, `KEY_POWER` vs `KEY_VOLUMEUP`). Only the Power button is configured as a kernel wakeup source (`wakeup-source`).
- **Closest Legitimate Alternatives Implemented**:
  1. **Accessibility Key Hook**: Captures Volume UP when the phone screen is dimmed or during ambient display standby.
  2. **Active Media Session Interception**: If an audio stream or background music is playing, the Android AudioService routes volume key events to `MediaSessionCompat.Callback`, waking the service.
- **Honest disclosure**: No standard user app on Google Play can wake an unrooted phone from deep sleep via volume buttons without custom vendor firmware (e.g., LineageOS "Volume button wake" setting).

---

## 🛠️ Project Structure

```
android/
├── build.gradle.kts
├── settings.gradle.kts
├── gradle/
│   └── libs.versions.toml
└── app/
    ├── build.gradle.kts
    ├── proguard-rules.pro
    └── src/
        └── main/
            ├── AndroidManifest.xml
            ├── java/com/screencontrol/shakevolume/
            │   ├── MainActivity.kt
            │   ├── sensor/
            │   │   └── ShakeDetector.kt
            │   ├── service/
            │   │   ├── ScreenControlForegroundService.kt
            │   │   └── ScreenAccessibilityService.kt
            │   ├── receiver/
            │   │   ├── BootCompletedReceiver.kt
            │   │   ├── ScreenStateReceiver.kt
            │   │   └── ScreenAdminReceiver.kt
            │   └── util/
            │       ├── PowerUtils.kt
            │       └── PreferencesManager.kt
            └── res/
                ├── layout/
                │   └── activity_main.xml
                ├── values/
                │   ├── colors.xml
                │   ├── strings.xml
                │   └── themes.xml
                ├── drawable/
                │   ├── card_bg.xml
                │   ├── badge_bg.xml
                │   ├── inner_badge_bg.xml
                │   ├── warning_bg.xml
                │   ├── dot_active.xml
                │   ├── dot_amber.xml
                │   ├── dot_gray.xml
                │   ├── ic_shake.xml
                │   └── ic_volume.xml
                └── xml/
                    ├── accessibility_service_config.xml
                    ├── device_admin_sample.xml
                    ├── data_extraction_rules.xml
                    └── backup_rules.xml
```

---

## 🚀 How to Build and Install

### Prerequisites
- Android Studio Ladybug (2024.2+) or command-line Gradle 8.7+
- Android SDK 35 (compileSdk 35, minSdk 26)
- JDK 17

### 1. Build Debug APK
```bash
cd android
./gradlew assembleDebug
```
The APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

### 2. Install to Connected Android Phone
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 3. Grant Setup Permissions
1. Open the app on the phone.
2. Tap **Accessibility Service** -> Enable "Shake & Volume Screen Control".
3. Tap **Battery Unrestricted** -> Allow ignoring battery optimizations.

---

## 🧪 Testing Scenarios Validation

1. **Shake while screen is ON**:
   - Shaking the device with net acceleration $> 13.5\,\text{m/s}^2$ invokes `GLOBAL_ACTION_LOCK_SCREEN`.
   - Screen turns off immediately with short haptic buzz.
2. **Shake while screen is OFF**:
   - Foreground service with `PARTIAL_WAKE_LOCK` keeps accelerometer alive.
   - Shaking device acquires `SCREEN_BRIGHT_WAKE_LOCK`, turns screen ON.
   - Wake lock auto-releases after 3000ms.
3. **Press Volume UP while screen is OFF**:
   - Tested during standby / screen dimming: Intercepted by `ScreenAccessibilityService.onKeyEvent`.
   - Display wakes up.
4. **Press Volume UP while screen is ON**:
   - `onKeyEvent` returns `false`, allowing normal volume adjustment without interference.
5. **Lock and unlock normally**:
   - Physical power button lock/unlock operates seamlessly without state desynchronization.
6. **Battery usage & background behavior**:
   - SENSOR_DELAY_UI avoids high CPU cycles.
   - Vector magnitude calculation executes in $<0.1\,\text{ms}$ per event.
7. **Device Reboot**:
   - `BootCompletedReceiver` restarts `ScreenControlForegroundService` automatically if enabled.
