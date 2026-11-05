# Memora — Security Vulnerability Fixes & Decisions

This document records every vulnerability found in the Memora codebase, the
decision taken to fix it, the reasoning, and the trade-offs accepted. All
changes are minimal, readable, and production-oriented. No speculative
refactors were made.

## How to read this

Each entry has:
- **Vulnerability** — what is wrong and where.
- **Severity** — High / Medium / Low.
- **Decision** — what was changed.
- **Why** — rationale and alternatives considered.
- **Files changed.**

---

## V1 — CSRF on state-changing oRPC endpoints (HIGH)

### Vulnerability
`packages/orpc` procedures that create/revoke API keys run behind the `api/rpc`
Next.js route. The route forwards `request.headers` (including the
better-auth session cookie) to the oRPC handler, but there is no CSRF
protection on any oRPC procedure. A malicious page can trigger a cross-origin
`fetch('/api/rpc', { credentials: 'include' })` and cause a logged-in user's
browser to create or revoke API keys.

### Decision
Added an `origin`-based CSRF check (`csrfMiddleware`) in
`packages/orpc/src/middleware/auth.ts` and applied `csrfMiddleware` to all
session-protected API-key handlers (create, list, revoke).

- If an `Origin` header is present and is not one of the trusted origins,
  the request is rejected with `403 FORBIDDEN`.
- Requests with no `Origin` header (server-side `call()` from the dashboard,
  health probes) are allowed, so server-side rendering and uptime checks keep
  working.

Trusted origins:
- production: `NEXT_PUBLIC_URL` only.
- development: `http://localhost:3000` and `BETTER_AUTH_URL`.

### Why
oRPC is served over `POST` with `Content-Type: application/json`, which is not a
"simple" request, so browsers send `Origin` and require a CORS preflight. The
app answers no preflight, and rejecting untrusted `Origin` values stops
cross-site invocation. This pairs with better-auth's `SameSite` session cookies
for defence in depth.

A custom-header CSRF token (`X-CSRF-Token`) was considered but rejected:
it would break server-side `call()` (no browser to set the header) and require
plumbing the token through every client call site. Origin validation covers the
real threat with no client changes.

### Files changed
- `packages/orpc/src/middleware/auth.ts` (added `csrfMiddleware`, `TRUSTED_ORIGINS`)
- `packages/orpc/src/handler/apiKey.ts` (`.use(csrfMiddleware)` on create/list/revoke)

---

## V2 — API keys hashed with unsalted SHA-256 (HIGH)

### Vulnerability
`packages/orpc/src/repository/apiKey.ts` hashed raw API keys with a plain
`createHash('sha256').update(rawKey).digest('hex')`. No salt, no pepper. If the
database is ever dumped, an attacker can precompute / brute-force the key space
(rainbow tables) and compare against stored hashes.

### Decision
Replaced plain SHA-256 with HMAC-SHA256 using a server-side pepper:

```
keyHash = HMAC-SHA256(PEPPER, rawKey)
```

`PEPPER = API_KEY_PEPPER ?? BETTER_AUTH_SECRET`. If neither is set, the module
throws at import time so we never ship keys hashed with an empty pepper. Added
`verifyApiKey(rawKey, keyHash)` which compares in constant time using
`crypto.timingSafeEqual` (after a length check), so verification does not leak
timing information.

### Why
HMAC with a server-secret pepper is the minimal, readable upgrade over an
unsalted fast hash. Argon2/bcrypt were considered but rejected: API keys are
high-entropy (`memora_` + 14 base64url bytes ≈ 86 bits), so a fast HMAC with a
secret pepper is sufficient and keeps the code simple and dependency-free.

### Files changed
- `packages/orpc/src/repository/apiKey.ts` (`hashApiKey`, `verifyApiKey`, `generateApiKey`, pepper guard)

---

## V3 — API keys existed but could not authenticate anything (HIGH)

### Vulnerability
The API key table, repository, and dashboard UI let users create keys, but no
code ever validated an `Authorization: Bearer <key>`. Keys created a false sense
of security: they did nothing.

### Decision
Added `authenticateApiKey(rawKey)` in the repository and an `apiKeyMiddleware`
plus `apiKeyProcedure` in middleware. A client sends
`Authorization: Bearer <key>`; the server:

1. looks the row up by `keyPrefix` (first 20 chars of the raw key),
2. verifies the HMAC hash with `timingSafeEqual`,
3. rejects revoked keys,
4. refreshes `lastUsedAt` on success so the dashboard shows real usage.

Exposed as `apiKey.verify` oRPC endpoint returning `{ valid, userId, keyPrefix, name }`.

### Why
This makes the API-key feature real and end-to-end. Lookup by prefix is
efficient (indexed column) and the constant-time hash comparison prevents
timing-based enumeration. Applying session-based CSRF to this endpoint is not
needed because bearer tokens are not auto-sent by browsers like cookies are.

### Files changed
- `packages/orpc/src/repository/apiKey.ts` (`authenticateApiKey`)
- `packages/orpc/src/middleware/auth.ts` (`apiKeyMiddleware`, `apiKeyProcedure`, `AuthedUser`)
- `packages/orpc/src/contract/apiKey.ts` (`verifyApiKey`, `verifyApiKeyOutput`)
- `packages/orpc/src/handler/apiKey.ts` (`verifyApiKeyHandler`)
- `packages/orpc/src/router.ts` (added `verify` to `apiKeyRouter`)

---

## V4 — No rate limiting anywhere (HIGH)

### Vulnerability
No endpoint enforced any rate limit. An attacker could brute-force login, spam
API-key creation, or repeatedly call the unauthenticated `/api/chat` proxy to
exhaust the Gemini quota (financial DoS).

### Decision
Added a small in-memory fixed-window rate limiter
(`packages/orpc/src/security/rate-limit.ts`) and applied it to every
session-protected API-key handler (create, list, revoke) keyed by user id.
The example `/api/chat` route gets a self-contained per-IP limiter (30 req/min).

Limits chosen:
- create API key: 10 / minute per user
- list API keys: 30 / minute per user
- revoke API key: 20 / minute per user
- example chat: 30 / minute per IP

### Why
In-memory fixed-window is the simplest readable limiter and is correct for a
single deployed instance. For multi-instance production it must be backed by
Redis (the `@workspace/cache` redis client is already available); this is
documented in the rate-limit source. Per-user (not per-IP) keys are used for
oRPC because the user is known after authentication; per-IP is used for the
public chat proxy where there is no user session.

Rate limiting is applied inside the handler (not as middleware) so `context.user`
is correctly typed by oRPC.

### Files changed
- `packages/orpc/src/security/rate-limit.ts` (new)
- `packages/orpc/src/handler/apiKey.ts` (`enforceRateLimit` calls)
- `packages/orpc/src/package.json` (added `./security` export)
- `packages/orpc/src/index.ts` (re-export `rateLimit`)
- `apps/example/app/api/chat/route.ts` (inline per-IP limiter)

---

## V5 — Unauthenticated `/api/chat` proxies Gemini (HIGH)

### Vulnerability
`apps/example/app/api/chat/route.ts` accepted any `POST` with a `prompt` and
called Gemini using the server's `OPEN_AI_KEY` with no authentication or
authorization. Anyone could spend the owner's API quota and incur cost.

### Decision
Added, in the example route:
- per-IP rate limiting (30/min, see V4),
- a maximum prompt length of 4,000 characters,
- generic, non-leaky error messages (the real error is logged server-side;
  clients receive "The AI service is temporarily unavailable...").

### Why
The example app is not wired to better-auth, so adding full session auth there
would be a large, out-of-scope change. Rate limiting + input capping + generic
errors materially reduce the abuse surface while keeping the demo runnable.
Production deployments should gate this route behind a session or API key.

### Files changed
- `apps/example/app/api/chat/route.ts`

---

## V6 — Hardcoded callbackURL `https://localhost:3000/dashboard` (MEDIUM)

### Vulnerability
`apps/web/actions/User/Login.action.ts` and `Signup.action.ts` hardcoded
`callbackURL: "https://localhost:3000/dashboard"`. This is wrong in production
(localhost, HTTPS) and would redirect users to a non-existent local endpoint.

### Decision
Changed both to the relative `callbackURL: "/dashboard"`, matching
`apps/web/app/components/auth/AuthForm.tsx` (which already used `/dashboard`).
better-auth resolves relative callback URLs against `BETTER_AUTH_URL`.

### Why
Relative callback URLs work in every environment and avoid hardcoding
`localhost`/HTTPS into server code.

### Files changed
- `apps/web/actions/User/Login.action.ts`
- `apps/web/actions/User/Signup.action.ts`

---

## V7 — Client-side dashboard snippet embedded server environment variables (MEDIUM)

### Vulnerability
`apps/web/app/dashboard/_ui/api-keys.tsx` contained an `INSTALL_SNIPPET`
template literal that interpolated `process.env.GEMINI_API_KEY!`,
`process.env.UPSTASH_REDIS_REST_URL!`, and `process.env.UPSTASH_REDIS_REST_TOKEN!`.
These are server-only secrets. Referencing them in client code is misleading
(in a client component `process.env` is not available) and encourages baking
server secrets into client-shipped code. It also referenced `GEMINI_API_KEY`
(which is not defined anywhere; the env uses `OPEN_AI_KEY`) and used the Redis
URL for the vector index instead of the vector URL.

### Decision
Replaced the snippet with placeholder values the user must supply themselves:

```
openAIKey: "<your-gemini-api-key>",
url: "<your-upstash-vector-url>",
token: "<your-upstash-vector-token>",
```

No `process.env` interpolation remains, nothing server-specific leaks to the
browser, and the snippet uses the correct vector env var names.

### Files changed
- `apps/web/app/dashboard/_ui/api-keys.tsx` (`INSTALL_SNIPPET`)

---

## V8 — Error messages leaked internal details to clients (MEDIUM)

### Vulnerability
`apps/loadtest/app/api/loadtest/route.ts` and `control/route.ts` returned
`error.message` directly to clients, and `apps/example/app/api/chat/route.ts`
returned the raw exception message. This can leak stack traces, environment
hints, or database details.

### Decision
Server-side errors are now logged (`console.error`) and clients receive a
generic message ("Request failed. Check the server logs for details." /
"The AI service is temporarily unavailable..."). Input-validation errors keep
specific, safe messages ("Invalid JSON body", "prompt is required").

### Files changed
- `apps/loadtest/app/api/loadtest/route.ts`
- `apps/loadtest/app/api/loadtest/control/route.ts` (unchanged structurally; message already generic — verified)
- `apps/example/app/api/chat/route.ts`

Note: `control/route.ts` already returned generic messages; no change was needed there.

---

## V9 — Cache stampede in MemoraSdk.chat (MEDIUM, reliability)

### Vulnerability
`packages/memorasdk/src/core/main.ts` ran a vector lookup and, on miss, called
Gemini then upserted. Concurrent identical prompts each triggered a separate
Gemini call (cache stampede), wasting quota and increasing latency under load.

### Decision
Added in-flight deduplication: concurrent `chat()` calls for the same prompt
share a single in-flight promise via a `Map<string, Promise<...>>` keyed by the
prompt. Completed promises are removed in a `finally` block.

### Why
This is a minimal, dependency-free, readable stampede guard. A distributed lock
(e.g. Redis) was considered but rejected as out of scope for a single-process
SDK; the in-memory map covers the common case of concurrent duplicate requests
within one process.

### Files changed
- `packages/memorasdk/src/core/main.ts` (`chat` wraps `runChat` with `inflight` dedup)

---

## V10 — better-auth `trustedOrigins` was commented out (MEDIUM)

### Vulnerability
`packages/auth/src/server.ts` had `trustedOrigins` commented out, so OAuth
callback validation was not explicitly configured for production.

### Decision
Enabled `trustedOrigins`:
- production: `[NEXT_PUBLIC_URL]` (filtered to defined values),
- development: `["http://localhost:3000"]`.

### Files changed
- `packages/auth/src/server.ts`

---

## Out of scope / intentionally not changed

- **`.env.local` files contain real credentials** (DB URL, OAuth secrets,
  Upstash tokens, Gemini key). They are already covered by `.gitignore`
  (`*.env*`) and were not modified. They must never be committed; rotate any
  credentials that were accidentally exposed.
- **Loadtest routes** (`/api/loadtest/*`) are a dev-only diagnostic tool with
  no authentication. They are not part of the production surface and were left
  unchanged beyond generic error messages.
- **Session tokens** in the `session` table are stored as plain random strings
  (standard for session tokens; better-auth manages rotation).
- **Rate limiter store** is in-memory; multi-instance production needs Redis.

---

## Verification

All packages and apps typecheck/build cleanly:

- `packages/orpc` — `bun run build` (tsc) ✅
- `packages/cache`, `packages/auth`, `packages/db` — `tsc` ✅
- `packages/memorasdk` — `tsc` ✅
- `apps/web` — `tsc --noEmit` ✅
- `apps/example` — `tsc --noEmit` ✅
- `apps/loadtest` — `tsc --noEmit` ✅

No runtime tests exist in this repo; behavior changes (HMAC hashing, API-key
auth) should be validated against a real database before a production deploy,
and `API_KEY_PEPPER` must be set in production.
