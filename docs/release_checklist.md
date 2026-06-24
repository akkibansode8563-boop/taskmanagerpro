# TaskMaster Pro – Release Checklist

Use this checklist to verify production builds before deploying updates to users.

---

## 1. Web Release Checklist

- [ ] **Tests**: Run `npm run test` and verify 100% pass rate.
- [ ] **Linting & Types**: Run `npm run lint` and `npm run typecheck` to confirm zero errors.
- [ ] **Production Build**: Run `npm run build` and ensure compilation finishes without errors.
- [ ] **Environment Variables**: Verify `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, and `GEMINI_API_KEY` are configured in Vercel.
- [ ] **PWA Audit**: Verify `/manifest.webmanifest` and service worker are loading.
- [ ] **Analytics**: Confirm telemetry logs execute without throwing runtime exceptions.

---

## 2. Mobile Release Checklist

- [ ] **Asset Check**: Ensure launcher icons and adaptive background splash screens are generated.
- [ ] **Permissions**: Confirm push-notification authorization flows prompt on initial login.
- [ ] **Offline Mode**: Toggle simulator network connection off and confirm local cache displays and queue saves.
- [ ] **Android Build (APK/AAB)**: Run `npx cap sync android` -> Build signed bundle in Android Studio.
- [ ] **iOS Build (IPA)**: Run `npx cap sync ios` -> Archive and sign build in Xcode.
