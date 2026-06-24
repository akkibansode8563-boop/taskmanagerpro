# TaskMaster Pro – Deployment Report

This report outlines the deployment procedures, hosting configs, and pipelines for Web and native platforms.

---

## 1. Web Deployment (Vercel)

Next.js is hosted on **Vercel** for optimal caching and serverless API execution.

### 1.1 Target Configuration
- **Framework Preset**: Next.js.
- **Root Directory**: `taskmanagerpro-main` (or `./` based on repo layout).
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 1.2 Environment Variables
Ensure the following environment variables are set in your Vercel Dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase API endpoint.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key.
- `NEXT_PUBLIC_APP_URL`: The deployed domain (e.g. `https://taskmasterpro.vercel.app`).
- `GEMINI_API_KEY`: Your Google Gemini API token (required for AI Smart Structuring).

---

## 2. CI/CD Pipeline (GitHub Actions)

- **Workflow Configuration**: Located in [`.github/workflows/ci.yml`](file:///.github/workflows/ci.yml).
- **Execution Rules**: Triggers automatically on pull requests and pushes to `main`.
- **Validation Steps**:
  1. Installs dependencies (`npm ci`).
  2. Runs code linter (`npm run lint`).
  3. Verifies typings (`npm run typecheck`).
  4. Runs unit tests (`npm run test`).
  5. Validates production compilation (`npm run build`).
