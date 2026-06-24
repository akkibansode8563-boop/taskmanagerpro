# TaskMaster Pro – Store Readiness Report

This report outlines publishing checklists, asset generation commands, and target policies for releasing TaskMaster Pro on the Google Play Store and Apple App Store.

---

## 1. Asset Generation

To generate native launcher icons and splash screens automatically:

1. **Prerequisite**: Install Capacitor assets generator globally:
   ```bash
   npm install -g @capacitor/assets
   ```
2. **Assets Folder**: Create an `assets` folder in the root containing:
   - `icon-only.png` (1024x1024 px, icon artwork).
   - `icon-background.png` (1024x1024 px, solid or gradient background).
   - `splash.png` (2732x2732 px, centered logo).
3. **Execution Command**:
   ```bash
   npx capacitor-assets generate --android --ios
   ```
   This automatically injects adaptive icons and launch screens into your `/android/` and `/ios/` folders.

---

## 2. Platform Build Instructions

### 2.1 Android Build (Google Play)
- **Compile Command**:
  ```bash
  npm run build && npx cap sync android
  ```
- **Execution**: Open the `/android/` project in Android Studio, sign the bundle (`Release AAB`), and upload it to the Google Play Console.

### 2.2 iOS Build (Apple App Store)
- **Compile Command**:
  ```bash
  npm run build && npx cap sync ios
  ```
- **Execution**: Open the Xcode workspace (`ios/App/App.xcworkspace`), select a development team, archive the build, and upload it via App Store Connect.

---

## 3. Compliance Requirements
- **Privacy Policy**: Link to your active `/privacy` page inside the store metadata.
- **Data Safety Forms**: Declare that data (profiles, tasks, meetings) is securely stored in Supabase with user consent.
- **Account Deletion**: Provide a link or option in metadata for users to delete their account in accordance with App Store Guidelines.
