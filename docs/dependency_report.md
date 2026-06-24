# TaskMaster Pro – Dependency Report

This report documents the library dependencies, version configurations, and platform engines in the TaskMaster Pro project.

---

## 1. Engine Specifications
- **Node**: `>=20.0.0` (Enforced in `package.json`).
- **Framework**: Next.js `15.5.9`.
- **Runtime**: React `19.2.1`.

---

## 2. Dependency Audit

| Package | Version | Purpose |
|---|---|---|
| `@supabase/supabase-js` | `^2.100.1` | Authentication, Realtime sync, Database storage API. |
| `genkit` | `^1.20.0` | Google Genkit framework for AI integrations. |
| `@genkit-ai/google-genai` | `^1.20.0` | Gemini plugin for Genkit. |
| `@capacitor/core` | `^8.3.0` | Capacitor native wrapper core. |
| `@capacitor/android` | `^8.3.0` | Capacitor Android native target. |
| `@capacitor/ios` | `^8.3.0` | Capacitor iOS native target. |
| `@capacitor/local-notifications`| `^8.0.2` | Native mobile push notifications. |
| `tailwindcss` | `^3.4.1` | Utility-first styling framework. |
| `gsap` | `^3.14.2` | Rich UI micro-animations. |
| `recharts` | `^2.15.1` | Dashboard analytics charts. |
| `zod` | `^3.24.2` | Input schema validation. |
| `vitest` | `^4.1.9` | Testing framework. |
| `jsdom` | `^26.0.0` | Headless browser testing environment. |

---

## 3. Security Recommendations

- **Audit Metrics**: Running `npm audit` reveals typical low/moderate peer dependency warnings. None are blockades.
- **Regular Updates**: Keep Supabase clients up-to-date to get the latest web sockets and auth patches.
