# API rate limits

The backend uses `express-rate-limit` with `rate-limit-redis`, backed by the
existing Redis client. The counters are shared across backend instances and use
fixed windows. Each policy counts every request, including failed requests.
The limiters initialize lazily on the first request, after the server's Redis
connection has been established.

| API category | Limit | Counter key | Scope |
| --- | --- | --- | --- |
| Authentication (`/api/v1/auth`) | 20 requests per 15 minutes | Client IP | Shared across auth routes |
| General API (`/api/v1/create`, `/delete`, `/read`, `/update`, `/upload`) | 300 requests per minute | Client IP | Shared across general API routes |
| Uploads (`/api/v1/upload/glb`, `/pdf`, `/image`) | 20 requests per hour | Authenticated user ID | Shared across the user's upload routes |

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
