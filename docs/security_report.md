# TaskMaster Pro – Security Report

This report outlines the security measures, session protections, data policies, and network controls implemented in the TaskMaster Pro workspace.

---

## 1. Authentication & Authorization

### 1.1 Secure Sessions
- **Supabase Authentication**: Utilizes standard JWT tokens with access and refresh tokens.
- **PKCE Flow**: Implements Proof Key for Code Exchange (PKCE) for OAuth and Google redirects, protecting logins from intercept attacks.

### 1.2 Idle Session Timeout
- **Inactivity Check**: An active listener in `AuthProvider` monitors user activities (`mousemove`, `keypress`, `scroll`, etc.).
- **Automatic Logout**: Automatically logs out users and clears local workspace data after 30 minutes of complete inactivity.

### 1.3 Row-Level Security (RLS)
- **Database Policies**: All database tables (`profiles`, `tasks`, `meetings`) have RLS explicitly enabled.
- **Access Control**: Users can only read, write, update, or delete records where `auth.uid() = user_id`.

---

## 2. Network & Header Hardening

### 2.1 Security Headers
The following headers are configured in `next.config.ts` for all pages:
- **Strict-Transport-Security (HSTS)**: Enforces HTTPS connections globally for 2 years, including subdomains.
- **X-Frame-Options**: Set to `DENY` to prevent clickjacking attacks.
- **X-Content-Type-Options**: Set to `nosniff` to prevent MIME-type sniffing.
- **Referrer-Policy**: Set to `strict-origin-when-cross-origin` to prevent leakage of sensitive referrer data.
- **Permissions-Policy**: Disables camera, microphone, and geolocation features by default.

### 2.2 Client-Side Input Sanitization
- **Zod Schema Validation**: Form submissions (add tasks, edit tasks, meeting minutes, authentication credentials) are validated against strict schema rules.
- **Supabase Parameterization**: SQL injection is prevented natively as all client actions execute via parameterized PostgREST RPC requests.
