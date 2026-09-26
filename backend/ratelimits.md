# API rate limits

The backend uses `express-rate-limit` with `rate-limit-redis`, backed by the
existing Redis client. The counters are shared across backend instances and use
fixed windows. Each policy counts every request, including failed requests.
The limiters initialize lazily on the first request, after the server's Redis
connection has been established.

| API category | Limit | Counter key | Scope |
| --- | --- | --- | --- |
| Login flow (`GET /api/v1/auth/google`, `GET /api/v1/auth/google/callback`, `POST /api/v1/auth/obtain-session`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/logout-all`) | 20 requests per 15 minutes | Client IP | Shared across these auth routes |
| General API (`/api/v1/create`, `/delete`, `/read`, `/update`, `/upload`, plus `GET /api/v1/auth/me` and `GET /api/v1/auth/sessions`) | 300 requests per minute | Client IP | Shared across general API routes |
| Uploads (`/api/v1/upload/glb`, `/pdf`, `/image`) | 20 requests per hour | Authenticated user ID | Shared across the user's upload routes |

`GET /api/v1/auth/me` and `GET /api/v1/auth/sessions` intentionally use the
general API limit instead of the login-flow limit: the client calls `/me` on
every app open (and `/sessions` on the settings page), so keeping them in the
strict 20-per-15-minutes bucket would lock normal users out after ~20 page
loads. The strict bucket is reserved for the login/callback/session-issuance
flow, where brute-force protection matters.

Uploads pass through both the general API limit and the stricter per-user
upload limit. The upload-specific limiter runs after session verification and
before the request body is parsed or the file is sent to ImageKit. Invalid or
missing sessions are rejected by session verification and do not consume the
per-user quota.

Limited requests return HTTP `429` with the standard `RateLimit` headers and a
JSON response containing `success: false`, a retry message, and `code: 429`.
Redis store errors are passed to the existing Express error handler rather than
silently allowing requests through.

Redis keys use the `REDIS_PREFIX` environment variable, or `partlens` when it
is unset, followed by `:rate-limit:` and the policy name. Keep the prefix
consistent across backend instances sharing the same Redis database.

The app currently trusts forwarded proxy headers in production. Configure the
deployment proxy to overwrite untrusted `X-Forwarded-For` headers (or narrow
Express's trusted proxy configuration) so IP-based limits cannot be bypassed
by clients supplying spoofed forwarding headers.
