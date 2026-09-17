# OI Pulse Dashboard — License Server

Tiny activation API for the OI Pulse Dashboard (Billionit Wealth). Runs as Vercel
serverless functions backed by MongoDB Atlas.

**License rule:** one license key binds to the first **trading account** (broker client id)
that activates it. After that, only that account can use the key — on **any number of
devices**. A different account is rejected. No per-machine lock.

## Endpoints
| Method + path | Auth | Body | Purpose |
|---|---|---|---|
| `GET /api/health` | — | — | Service + DB check |
| `POST /api/activate` | — | `{ license_key, account_id }` | Bind (first time) / validate the license for an account. The desktop app calls this. |
| `POST /api/issue` | `x-admin-secret` | `{ buyer_name, buyer_email, buyer_mobile, expiry? }` | Create a new license key (called server-side after payment is verified). Returns `{ license_key }`. |
| `POST /api/revoke` | `x-admin-secret` | `{ license_key, status?, reset_account? }` | Revoke/suspend/re-enable a key; `reset_account` clears the account binding. |

Responses are JSON `{ ok: true, ... }` or `{ ok: false, error }`.

## Data (MongoDB collection `licenses`)
`key` (unique), `account_id` (null until first activation), `status` (active|revoked|suspended),
`buyer_name/email/mobile`, `expiry` (nullable), `created_at`, `activated_at`, `last_seen`.

## Deploy (Vercel + MongoDB Atlas)
1. Push this folder to a private repo and import it into a **new Vercel project** (separate from
   the marketing site). Framework preset: **Other** (Vercel auto-detects `api/`).
2. In the Vercel project **Environment Variables**, set (from `.env.example`):
   - `MONGODB_URI` — the Billionit MongoDB Atlas connection string.
   - `MONGODB_DB` — e.g. `oi_license`.
   - `ADMIN_SECRET` — a long random string (keep it private; used to issue/revoke keys).
3. In MongoDB Atlas → **Network Access**, allow Vercel (add `0.0.0.0/0` with a strong DB user, or
   Vercel's egress IPs).
4. Deploy. Add the custom domain **`license.billionitwealth.in`** in the Vercel project settings
   (CNAME per Vercel's instructions).
5. Verify: `GET https://license.billionitwealth.in/api/health` → `{ "ok": true, "db": "connected" }`.

## How it's used
- **Desktop app:** on startup / before capture, calls `POST /api/activate` with the buyer's license
  key + their broker client id. First call binds the key to that account; later calls validate.
- **Purchase flow (billionitwealth.in):** after a payment is verified, the site's server calls
  `POST /api/issue` (with `x-admin-secret`) to mint a key and emails it to the buyer.

_No secrets are committed. `.env` is git-ignored; configure everything in Vercel env vars._
