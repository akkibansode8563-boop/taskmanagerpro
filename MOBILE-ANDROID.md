# Android APK Build Guide

This project is prepared for a `PWA + Capacitor + Android Studio` workflow.

## What is already configured

- Web manifest: [manifest.ts](C:\Users\DCC\studio-main\src\app\manifest.ts)
- Service worker: [sw.js](C:\Users\DCC\studio-main\public\sw.js)
- Capacitor config: [capacitor.config.ts](C:\Users\DCC\studio-main\capacitor.config.ts)
- Android app id: `com.dcc.taskmasterpro`
- Android runtime URL defaults to:
  - `https://taskmanagerpro-kappa.vercel.app`

## 1. Make sure the web app is deployed

Capacitor is configured to load the deployed app URL, so first confirm your latest web version is live.

## 2. Generate the Android project

Run:

```powershell
npx cap add android
```

If the Android project already exists, use:

```powershell
npx cap sync android
```

## 3. Open in Android Studio

Run:

```powershell
npx cap open android
```

Or open the folder manually:

```text
C:\Users\DCC\studio-main\android
```

## 4. Build the APK

In Android Studio:

1. Wait for Gradle sync to finish
2. Open `Build`
3. Choose `Build Bundle(s) / APK(s)`
4. Click `Build APK(s)`

For Play Store release later:

1. Open `Build`
2. Choose `Generate Signed Bundle / APK`
3. Prefer `Android App Bundle (AAB)` for store upload

## 5. Update the container after web changes

Whenever the web app changes:

```powershell
npx cap sync android
```

If you change the deployed domain, update [capacitor.config.ts](C:\Users\DCC\studio-main\capacitor.config.ts) and run sync again.

## Notes

- Active route detection already exists in the app navigation.
- The mobile bottom navigation has GSAP animation for quicker visual feedback.
- Because this uses a hosted app URL, your Android container always loads the latest deployed version after sync/build.
