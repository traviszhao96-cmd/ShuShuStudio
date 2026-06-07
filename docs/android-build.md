# Android Build Notes

## Current State

The project is prepared as a Capacitor Android app.

- Web output: `dist`
- Android project: `android/`
- Capacitor config: `capacitor.config.ts`
- App id: `com.shushustudio.ssmaster`
- App name: `ShuShuStudio`
- Local JDK: Temurin 21, installed under `%USERPROFILE%\.local\android-build-tools\jdk21`
- Local Android SDK: `%LOCALAPPDATA%\Android\Sdk`
- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## Commands

Build the web app without running the local case sync prebuild hook:

```powershell
npm run build:web
```

Sync web assets into Android:

```powershell
npm run android:sync
```

Open Android Studio:

```powershell
npm run android:open
```

Build debug APK after JDK and Android SDK are installed:

```powershell
npm run android:build:debug
```

Install debug APK to a connected Android device:

```powershell
npm run android:install:debug
```

## Installed Tooling

This machine has been configured with:

```text
JAVA_HOME=%USERPROFILE%\.local\android-build-tools\jdk21\jdk-21.0.11+10
ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
ANDROID_SDK_ROOT=%LOCALAPPDATA%\Android\Sdk
```

If a fresh terminal does not see these variables immediately, restart the terminal or sign out and back in once.
