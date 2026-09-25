# PartLens Backend API Documentation

> **Version:** 1.0.0
> **Base URL:** `http://localhost:5050/api/v1`
> **Health endpoint:** `GET http://localhost:5050/status` (root, not under `/api/v1`)
> **Authentication:** Bearer session tokens (opaque random tokens, SHA-256 hashed server-side; not JWTs)
> **Database:** PostgreSQL via Drizzle ORM
> **Redis:** OAuth state/callback tokens + rate-limit counters (not a cache)
> **File Storage:** ImageKit

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Authentication](#authentication)
- [Health Check](#health-check)
- [Projects](#projects)
- [Parts & Manuals](#parts--manuals)
- [Bookmarks](#bookmarks)
- [Users](#users)
- [File Upload](#file-upload)
- [Rate Limiting](#rate-limiting)
- [Error Responses](#error-responses)
- [Database Schema](#database-schema)
- [Environment Variables](#environment-variables)
- [Middleware](#middleware)
- [Validators](#validators)
- [Running the Backend](#running-the-backend)

---

## Architecture Overview

Session authentication uses opaque random bearer tokens stored server-side as
SHA-256 hashes; these tokens are not JWTs.

The backend is an **Express 5** server written in **TypeScript (ESM)** using the following stack:

| Component | Technology |
|---|---|
| Framework | Express 5 |
| ORM | Drizzle ORM (`drizzle-orm/node-postgres`, `pg` Pool) |
| Database | PostgreSQL (migrations in `./drizzle`, applied on boot) |
| Redis | `redis` client — OAuth state/callback tokens, `express-rate-limit` + `rate-limit-redis` counters |
| File Upload | Multer (memory storage) → ImageKit (`@imagekit/nodejs`) |
| Auth | Google OAuth 2.0 + server-side sessions |
| Validation | express-validator |
| Logging | Morgan (`combined`) |
| Misc | `cors()`, `nanoid`, `express.json()` / `urlencoded({ extended: false })` |

`trust proxy` is enabled only when `NODE_ENV=production`. Responses use
`json spaces: 1`. Unmatched routes return `404 { success: false, message:
"No matching route found.", code: 404 }`.

### Project Structure

```
backend/
├── src/
│   ├── index.ts                  # Entry point, route mounting, /status, 404, error handler
│   ├── db/
│   │   ├── index.ts              # pg Pool, drizzle instance, initializeDatabase() (SELECT 1 + migrate)
│   │   └── schema.ts             # users, sessions, projects, project_views, parts, part_manuals, *_bookmarks
│   ├── middleware/
│   │   ├── verifySession.ts      # Required Bearer session auth
│   │   ├── isAuthenticated.ts    # Optional (non-blocking) session auth
│   │   ├── isAdminRequest.ts     # ADMIN_KEY timing-safe compare for /status
│   │   ├── validate.ts           # express-validator runner
│   │   ├── ratelimits.ts         # auth / general / upload Redis rate limiters
│   │   └── errorHandler.ts       # Generic 500 handler
│   ├── routes/v1/
│   │   ├── auth.ts               # Google OAuth, obtain-session, me, logout, sessions
│   │   ├── create.ts             # POST /project, /part, /manual, /bookmark/project, /bookmark/part
│   │   ├── read.ts               # GET /user, /user/projects, /projects, /search/projects,
│   │   │                         #     /projects/discover, /project/:publicId/{details,analytics,parts,meta},
│   │   │                         #     /project/:publicId, /bookmarks
│   │   ├── update.ts             # PATCH /project/:publicId, /manual/:partId (updates a part), /user
│   │   ├── delete.ts             # DELETE /project/:publicId, /part/:partId, /manual/:manualId,
│   │   │                         #        /bookmark/project/:publicId, /bookmark/part/:partId
│   │   └── upload.ts             # POST /upload/{glb,pdf,image}
│   ├── validators/
│   │   ├── project.validator.ts  # create/update/search/discover project validators
│   │   ├── manual.validator.ts   # create part+manuals / single manual / update/delete validators
│   │   ├── bookmark.validator.ts # bookmark create/delete/list validators
│   │   └── user.validator.ts     # update user / get profile / get user-projects validators
│   ├── lib/
│   │   ├── escapeLike.ts         # escape \, %, _ for LIKE/ILIKE
│   │   └── pagination.ts         # paginate() (keyset id DESC) + paginateOffset() (offset)
│   ├── redis/
│   │   └── redisClient.ts        # redis client from REDIS_URL
│   └── types/
│       └── express.d.ts          # req.user / req.session / req.isAdmin / req.isAuthenticated
├── drizzle/                      # Migration files
├── .env                          # Environment configuration (see .env.example)
├── package.json
└── tsconfig.json
```

Route mounting (`src/index.ts`):

| Mount | Rate limiter |
|---|---|
| `/api/v1/auth` | `authRateLimit` (20 / 15 min per IP) |
| `/api/v1/create`, `/delete`, `/read`, `/update`, `/upload` | `generalRateLimit` (300 / min per IP) |
| `POST /api/v1/upload/{glb,pdf,image}` | additionally `uploadRateLimit` (20 / hour per user) |

---

## Authentication

### Google OAuth Flow

1. **Frontend** redirects user to `GET /api/v1/auth/google`
2. Backend generates **32 random bytes, hex-encoded (64 chars)**, stores `1` in Redis at `${REDIS_PREFIX}:auth:state:<state>` with a **600-second (10-minute) TTL**, and redirects to Google's OAuth consent screen (`prompt=select_account`, `scope="openid email profile"`, `redirect_uri=${BACKEND_URL}/api/v1/auth/google/callback`)
3. Google redirects back to `GET /api/v1/auth/google/callback` with `code` and `state`
4. Backend validates single-use state against Redis (deletes it), exchanges the code at `https://oauth2.googleapis.com/token`, fetches the profile at `https://www.googleapis.com/oauth2/v3/userinfo`
5. Existing user is looked up by `googleId = profile.sub`; otherwise a user is created with `email`, `emailVerified`, `name`, `avatarUrl = profile.picture`, `username = nanoid()` (21-char default). A session row is created (30-day expiry); the session token is **64 random bytes (`base64url`)** stored as SHA-256 hex. A callback token (**32 random bytes, `base64url`**) is stored in Redis at `${REDIS_PREFIX}:auth:callback:<token>` with a **60-second TTL**
6. Frontend is redirected to `${FRONTEND_URL}/auth/callback?code=<callbackToken>`
7. Frontend exchanges the callback token for the session token via `POST /api/v1/auth/obtain-session` (key is deleted on use)

### Obtain Session Token

```
POST /api/v1/auth/obtain-session
```

**Request Body:**

| Field | Type | Description |
|---|---|---|
| `callback_code` | string | The callback token received from the OAuth redirect |

**Response (200):**

```json
{
  "success": true,
  "message": "success",
  "token": "<session_token>",
  "code": 200
}
```

**Error Responses:**

| Code | Message | Cause |
|---|---|---|
| 400 | `"invalid request"` | Missing `callback_code` |
| 400 | `"invalid callback code"` | Unknown/expired callback token |

> The returned `token` must be used as a **Bearer token** in the `Authorization` header for all subsequent authenticated requests. Callback codes are single-use.

### Start Google OAuth

```
GET /api/v1/auth/google
```

No authentication required. Creates the Redis OAuth state (600 s TTL) and
returns a `302` redirect to `https://accounts.google.com/o/oauth2/v2/auth?...`.

### Google OAuth Callback

```
GET /api/v1/auth/google/callback?code=<google_code>&state=<oauth_state>
```

Google calls this endpoint after consent. On success the backend creates a
30-day session, stores a one-time callback code in Redis for 60 seconds, and
returns a `302` redirect to `<FRONTEND_URL>/auth/callback?code=<callback_code>`.

| Code | Message | Cause |
|---|---|---|
| 400 | `"invalid request"` | Missing `code` or `state` |
| 400 | `"invalid state"` | Unknown/expired/reused state |

### Get Current User

```
GET /api/v1/auth/me
```

**Headers:**

```
Authorization: Bearer <session_token>
```

**Response (200):**

```json
{
  "success": true,
  "message": "authentication success",
  "user": {
    "id": "uuid",
    "username": "string",
    "name": "string",
    "email": "string",
    "avatarUrl": "string|null",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "code": 200
}
```

### Logout (Current Session)

```
POST /api/v1/auth/logout
```

**Headers:** `Authorization: Bearer <session_token>`

Deletes only the current session row.

**Response (200):**

```json
{
  "success": true,
  "message": "session terminated",
  "code": 200
}
```

### Logout All Other Sessions

```
POST /api/v1/auth/logout-all
```

**Headers:** `Authorization: Bearer <session_token>`

Deletes every session of the same user except the current one.

**Response (200):**

```json
{
  "success": true,
  "message": "other sessions terminated",
  "code": 200
}
```

### List Active Sessions

```
GET /api/v1/auth/sessions
```

**Headers:** `Authorization: Bearer <session_token>`

**Response (200):**

```json
{
  "success": true,
  "message": "active sessions retrieved",
  "sessions": [
    {
      "id": "uuid",
      "ipAddress": "string",
      "userAgent": "string",
      "createdAt": "ISO8601",
      "lastActive": "ISO8601",
      "expiresAt": "ISO8601",
      "current": true
    }
  ],
  "code": 200
}
```

> Expired sessions of the user are deleted before the list is built. The
> `current` field marks the session making the request. `tokenHash`/`userId`
> are never exposed.

### Session Verification

Authenticated routes use `verifySession`, which:

1. Requires `Authorization: Bearer <token>` (`401 "Unauthorized"` when missing/unknown/expired; `401 "Invalid authorization header"` when the scheme is not `Bearer` or the token part is missing)
2. SHA-256 hashes the token and looks it up in `sessions.token_hash`; deletes and rejects expired sessions
3. Updates `ipAddress`, `userAgent`, `lastActive` when the IP/UA changed or `lastActive` is older than 15 minutes
4. Attaches `req.user` (`id, username, name, email, avatarUrl, createdAt, updatedAt`) and `req.session` (full session row)

`GET /api/v1/read/project/:publicId` instead uses `isAuthenticated`: identical
checks, but never rejects — it sets `req.isAuthenticated` (`true`/`false`) and
only populates `req.user`/`req.session` on success (used for `bookmarked`
flags).

---

## Health Check

`ADMIN_KEY` is optional. The endpoint always responds; when `ADMIN_KEY` is
configured and the matching value is supplied, the response also includes
per-service status in `services`. The route is at the server root, not under
`/api/v1`.

```
GET /status
```

**Headers:** `Authorization: Bearer <ADMIN_KEY>` (optional; `services` only shown to admins)

**Response — healthy (200):**

```json
{
  "success": true,
  "message": "All systems operational",
  "healthy": true,
  "code": 200,
  "services": {
    "postgres": "up",
    "redis": "up"
  }
}
```

**Response — degraded (503):**

```json
{
  "success": false,
  "message": "Some/all systems are not operational or unavailable",
  "healthy": false,
  "code": 503,
  "services": {
    "postgres": "up",
    "redis": "down"
  }
}
```

> `services` is present only when `req.isAdmin` is true. `success` mirrors
> `healthy`. Postgres is checked with `SELECT 1`; Redis with `PING` (expects
> `PONG`). The admin comparison uses `crypto.timingSafeEqual` against
> `ADMIN_KEY` (second whitespace-separated header part); missing/short keys
> are treated as non-admin. When `ADMIN_KEY` is unset, everyone is non-admin.

---

## Projects

Auth matrix:

| Endpoint | Auth |
|---|---|
| `POST /api/v1/create/project` | required (owner created) |
| `GET /api/v1/read/projects` | required (owner-scoped dashboard) |
| `GET /api/v1/read/project/:publicId/details` | required (owner-only) |
| `GET /api/v1/read/project/:publicId/analytics` | required (owner-only) |
| `GET /api/v1/read/project/:publicId/parts` | required (owner-only) |
| `PATCH /api/v1/update/project/:publicId` | required (owner-only) |
| `DELETE /api/v1/delete/project/:publicId` | required (owner-only) |
| `GET /api/v1/read/search/projects` | public (listed only) |
| `GET /api/v1/read/projects/discover` | public (listed only) |
| `GET /api/v1/read/user`, `/user/projects` | public (listed only) |
| `GET /api/v1/read/project/:publicId/meta` | public (listed or unlisted) |
| `GET /api/v1/read/project/:publicId` | public, optional auth (listed or unlisted; auth adds `bookmarked` flags) |

### Create a Project

```
POST /api/v1/create/project
```

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ Yes | Project name, trimmed, 1–255 chars (`"name must not be empty"` when blank) |
| `description` | string\|null | No | Optional, trimmed, max 1000 chars |
| `file_url` | string | ✅ Yes | ImageKit-hosted `.glb` URL, max 2048 chars |
| `unlisted` | boolean | ✅ Yes | **Required** boolean visibility flag (DB default is also `true`, but the validator rejects a missing value) |

**Validation (`file_url`):**
- `IMAGEKIT_URL_ENDPOINT` must be configured or validation fails (`"file_url could not be validated"`)
- Must start with `IMAGEKIT_URL_ENDPOINT` (case-sensitive) and end with `.glb` (case-insensitive)
- `HEAD` request (5 s timeout) must succeed with `content-type: model/gltf-binary` or `application/octet-stream`, else `"file_url must point to a valid GLB file"` / `"file_url must point to a reachable GLB file"`

**Response (200; note: not 201):**

```json
{
  "success": true,
  "message": "project created",
  "data": {
    "id": "uuid",
    "publicId": "nano_id_21_chars",
    "userId": "uuid",
    "name": "string",
    "description": "string|null",
    "glbFileUrl": "string",
    "unlisted": true,
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "code": 200
}
```

### List Projects (Owner-Scoped)

```
GET /api/v1/read/projects
```

**Headers:** `Authorization: Bearer <session_token>`

Returns only projects owned by the authenticated user, ordered by `updatedAt`
descending, each with `parts` (row count) and `views` (unique-IP row count).

**Response (200):**

```json
{
  "success": true,
  "message": "Projects retrieved",
  "data": [
    {
      "id": "uuid",
      "publicId": "string",
      "name": "string",
      "description": "string|null",
      "glbFileUrl": "string",
      "unlisted": true,
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601",
      "parts": 0,
      "views": 0
    }
  ],
  "stats": {
    "total_projects": 0,
    "total_parts": 0,
    "total_views": 0
  },
  "code": 200
}
```

### Search Public Projects (Infinite Scroll)

```
GET /api/v1/read/search/projects?q=<query>&limit=10&cursor=0
```

**Public endpoint.** Only `unlisted = false` projects are searched.

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `q` | string | ✅ Yes | 1–200 chars, trimmed. Case-insensitive substring match (`ILIKE %q%`) against `name` and `description` |
| `limit` | integer | No | 1–50 (default `10`) |
| `cursor` | integer | No | Zero-based offset (default `0`). Pass back string `nextCursor` |

**Relevance ordering:**

1. `name` equals `q` (case-insensitive)
2. `name` starts with `q`
3. `name` contains `q`
4. only `description` contains `q`

Ties: view count (`COUNT(project_views.id)`) `DESC`, then `createdAt` `DESC`,
then `id` `DESC`.

**Response (200):**

```json
{
  "success": true,
  "message": "Project search completed",
  "data": {
    "items": [
      {
        "id": "uuid",
        "publicId": "string",
        "name": "string",
        "description": "string|null",
        "glbFileUrl": "string",
        "createdAt": "ISO8601",
        "updatedAt": "ISO8601",
        "owner": {
          "username": "string",
          "name": "string",
          "avatarUrl": "string|null"
        },
        "views": 0,
        "parts": 0
      }
    ],
    "nextCursor": "10",
    "hasMore": true
  },
  "code": 200
}
```

> `nextCursor` is the offset string for the next request, or `null` when done.
> `\`, `%`, `_` in `q` are escaped so they match literally.

### Discover Public Projects (Infinite Scroll)

```
GET /api/v1/read/projects/discover?sort=newest&limit=10&cursor=0
```

**Public endpoint.** Only `unlisted = false` projects.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `sort` | string | No | `'newest'` (default) or `'top'` |
| `limit` | integer | No | 1–50 (default `10`) |
| `cursor` | integer | No | Zero-based offset (default `0`) |

- `sort=newest` → `createdAt DESC, id DESC`
- `sort=top` → `COUNT(project_views.id) DESC, createdAt DESC, id DESC` (one row per unique viewer IP)

**Response (200):** same `items` shape as search.

```json
{
  "success": true,
  "message": "Newest projects retrieved",
  "data": {
    "items": [],
    "nextCursor": null,
    "hasMore": false
  },
  "code": 200
}
```

> `message` is `"Top projects retrieved"` when `sort=top`.

### Get Project Details (Owner)

```
GET /api/v1/read/project/:publicId/details
```

**Headers:** `Authorization: Bearer <session_token>`

Owner-only (`publicId` + `userId` must match).

**Response (200):**

```json
{
  "success": true,
  "message": "Project details retrieved",
  "data": {
    "id": "uuid",
    "publicId": "string",
    "userId": "uuid",
    "name": "string",
    "description": "string|null",
    "glbFileUrl": "string",
    "unlisted": true,
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "code": 200
}
```

Errors: `400 "Invalid project identifier"` (non-string param) · `404 "Project not found"` (missing or not owned).

### Get Project Analytics (Owner)

```
GET /api/v1/read/project/:publicId/analytics
```

**Headers:** `Authorization: Bearer <session_token>`

Owner-only. Day boundaries are UTC (today = UTC midnight, week starts Sunday
UTC, month starts the 1st UTC); `recentlyViewed` holds up to 10 `viewedAt`
timestamps, newest first.

**Response (200):**

```json
{
  "success": true,
  "message": "Project analytics retrieved",
  "data": {
    "project": { "id": "uuid", "publicId": "string", "name": "string" },
    "uniqueViewers": 0,
    "viewersToday": 0,
    "viewersThisWeek": 0,
    "viewersThisMonth": 0,
    "recentlyViewed": ["ISO8601"]
  },
  "code": 200
}
```

Errors: `400 "Invalid project identifier"` · `404 "Project not found"`.

### Get Parts for a Project (Owner)

```
GET /api/v1/read/project/:publicId/parts
```

**Headers:** `Authorization: Bearer <session_token>`

Owner-only. Returns the project (limited fields) plus its parts; each part
carries its manuals (possibly empty). Rows ordered by `manual.uploadedAt`
`DESC`.

**Response (200):**

```json
{
  "success": true,
  "message": "Project manuals retrieved",
  "data": {
    "project": {
      "id": "uuid",
      "publicId": "string",
      "name": "string",
      "description": "string|null",
      "glbFileUrl": "string",
      "unlisted": true,
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    },
    "parts": [
      {
        "id": "uuid",
        "partNumber": "string",
        "name": "string",
        "description": "string|null",
        "createdAt": "ISO8601",
        "updatedAt": "ISO8601",
        "manuals": [
          {
            "id": "uuid",
            "title": "string",
            "fileUrl": "string",
            "uploadedAt": "ISO8601"
          }
        ]
      }
    ]
  },
  "code": 200
}
```

Errors: `400 "Invalid project identifier"` · `404 "Project not found"`.

### Get Project Meta (Public)

```
GET /api/v1/read/project/:publicId/meta
```

Public, no auth. Works for listed and unlisted projects when the ID is known.
No view is recorded. Note: unlike the full view below, this omits `glbFileUrl`,
parts, and bookmark flags.

**Response (200):**

```json
{
  "success": true,
  "message": "Project meta retrieved",
  "data": {
    "id": "uuid",
    "publicId": "string",
    "name": "string",
    "description": "string|null",
    "unlisted": true,
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601",
    "owner": {
      "id": "uuid",
      "username": "string",
      "name": "string",
      "avatarUrl": "string|null"
    },
    "views": 0
  },
  "code": 200
}
```

Errors: `400 "Invalid project identifier"` · `404 "Project not found"`.

### Get Public Project (View Tracking)

```
GET /api/v1/read/project/:publicId
```

Public; auth is optional (`isAuthenticated`). Works for listed and unlisted
projects when the ID is known. When authenticated, the response includes
`bookmarked` (project) and per-part `bookmarked` flags.

**Response (200):**

```json
{
  "success": true,
  "message": "Project retrieved",
  "data": {
    "id": "uuid",
    "publicId": "string",
    "userId": "uuid",
    "name": "string",
    "description": "string|null",
    "glbFileUrl": "string",
    "unlisted": true,
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601",
    "bookmarked": false,
    "owner": {
      "id": "uuid",
      "username": "string",
      "name": "string",
      "avatarUrl": "string|null",
      "createdAt": "ISO8601"
    },
    "views": 0,
    "parts": [
      {
        "id": "uuid",
        "projectId": "uuid",
        "partNumber": "string",
        "name": "string",
        "description": "string|null",
        "createdAt": "ISO8601",
        "updatedAt": "ISO8601",
        "bookmarked": false,
        "manuals": [
          {
            "id": "uuid",
            "partId": "uuid",
            "title": "string",
            "fileUrl": "string",
            "uploadedAt": "ISO8601"
          }
        ]
      }
    ]
  },
  "code": 200
}
```

> **Side effect (after the response is sent):** upsert into `project_views`
> keyed by `(project_id, ip)` setting `viewed_at = now()` — one row per unique
> viewer IP; repeat views only refresh the timestamp. `req.ip` (or
> `"unknown"`) is used.

Errors: `400 "Invalid project identifier"` · `404 "Project not found"`.

### Update a Project

```
PATCH /api/v1/update/project/:publicId
```

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

Owner-only. Body must contain at least one allowed field and no others
(`name`, `description`, `file_url`, `unlisted`); `file_url` maps to
`glbFileUrl`. Same `file_url` ImageKit + `HEAD` rules as creation.
`updatedAt` is refreshed.

**Request Body** (at least one required):

| Field | Type | Description |
|---|---|---|
| `name` | string | 1–255 chars |
| `description` | string\|null | Max 1000 chars |
| `file_url` | string | New ImageKit `.glb` URL |
| `unlisted` | boolean | Visibility toggle |

**Response (200):**

```json
{
  "success": true,
  "message": "Project updated",
  "data": { "id": "uuid", "publicId": "string" },
  "code": 200
}
```

(`data` is the full updated project row.) Errors: validation `400
"invalid request body"` (+ `at least one project field is required` /
`request contains an unsupported project field`) · `400 "Invalid project
identifier"` · `404 "Project not found"`.

### Delete a Project

```
DELETE /api/v1/delete/project/:publicId
```

**Headers:** `Authorization: Bearer <session_token>`

Owner-only. No validator; the `publicId` type is checked manually (its `400`
body has no `data` field, unlike most errors).

**Response (200):**

```json
{
  "success": true,
  "message": "Project deleted",
  "data": { "id": "uuid" },
  "code": 200
}
```

> Deletion removes the project row; `ON DELETE CASCADE` removes its parts,
> part manuals, views, and bookmarks. ImageKit files (GLB/PDFs) are **not**
> deleted by the backend.

---

## Parts & Manuals

Parts belong to one project; `(project_id, part_number)` is unique. A part can
have many manuals (PDFs). Note the intentionally odd route name:
`PATCH /api/v1/update/manual/:partId` updates a **part**, not a manual.

### Create a Part with Manuals

```
POST /api/v1/create/part
```

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

Runs in a transaction. The project must be owned by the caller. `file_urls`
may be an empty array (part is created with no manuals).

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `public_id` | string | ✅ Yes | Project public ID, 1–21 chars |
| `name` | string | ✅ Yes | Part name, 1–255 chars |
| `part_number` | string | ✅ Yes | Part number, 1–255 chars (unique per project) |
| `description` | string\|null | No | Max 1000 chars |
| `file_urls` | array | ✅ Yes | Array (possibly empty) of `{ title, file_url }` |

Each `file_urls` item:

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | ✅ Yes | 1–255 chars |
| `file_url` | string | ✅ Yes | ImageKit PDF URL, max 2048 chars; must start with `IMAGEKIT_URL_ENDPOINT`, end `.pdf` (case-insensitive); `HEAD` (5 s) must return `content-type: application/pdf` |

**Response (201):**

```json
{
  "success": true,
  "message": "Manual created successfully",
  "data": {
    "project": { "id": "uuid", "publicId": "string" },
    "part": {
      "id": "uuid",
      "projectId": "uuid",
      "partNumber": "string",
      "name": "string",
      "description": "string|null",
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    },
    "manuals": [
      {
        "id": "uuid",
        "partId": "uuid",
        "title": "string",
        "fileUrl": "string",
        "uploadedAt": "ISO8601"
      }
    ]
  },
  "code": 201
}
```

Errors: `404 "Project not found"` (missing or not owned) · `409 "A part
with this part number already exists in the project"`.

### Create a Manual for an Existing Part

```
POST /api/v1/create/manual
```

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

Adds one manual to a part in a caller-owned project.

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `part_id` | string (UUID) | ✅ Yes | Part identifier |
| `title` | string | ✅ Yes | 1–255 chars |
| `file_url` | string | ✅ Yes | Same ImageKit PDF + `HEAD` rules as above |

**Response (201):**

```json
{
  "success": true,
  "message": "Manual created successfully",
  "data": {
    "id": "uuid",
    "partId": "uuid",
    "title": "string",
    "fileUrl": "string",
    "uploadedAt": "ISO8601"
  },
  "code": 201
}
```

Errors: `404 "Part not found"` (missing or not in an owned project).

### Update a Part

```
PATCH /api/v1/update/manual/:partId
```

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

Despite `/manual/` in the path, this updates a **part** in a caller-owned
project. At least one of `part_number`/`name`/`description`; no other fields.

| Parameter | Type | Description |
|---|---|---|
| `partId` | UUID | Part identifier (path) |

**Request Body** (at least one required):

| Field | Type | Description |
|---|---|---|
| `part_number` | string | 1–255 chars (still unique per project) |
| `name` | string | 1–255 chars |
| `description` | string\|null | Max 1000 chars |

**Response (200):**

```json
{
  "success": true,
  "message": "Part updated",
  "data": { "id": "uuid", "projectId": "uuid" },
  "code": 200
}
```

(`data` is the full updated part row.) Errors: `400 "Invalid part
identifier"` · `404 "Part not found"` · `409 "A part with this part number
already exists in the project"`.

### Delete a Part

```
DELETE /api/v1/delete/part/:partId
```

**Headers:** `Authorization: Bearer <session_token>`

Owner-only (via the parent project). Cascades to its manuals
(`ON DELETE CASCADE`).

**Response (200):**

```json
{
  "success": true,
  "message": "Part deleted",
  "data": { "id": "uuid" },
  "code": 200
}
```

Errors: validation `400` (`partId must be a valid UUID`) · `400 "Invalid
part identifier"` · `404 "Part not found"`.

### Delete a Manual

```
DELETE /api/v1/delete/manual/:manualId
```

**Headers:** `Authorization: Bearer <session_token>`

Owner-only (via part → project).

**Response (200):**

```json
{
  "success": true,
  "message": "Manual deleted",
  "data": { "id": "uuid" },
  "code": 200
}
```

Errors: validation `400` (`manualId must be a valid UUID`) · `400 "Invalid
manual identifier"` · `404 "Manual not found"`.

---

## Bookmarks

Bookmarking is idempotent: re-bookmarking returns `200` with a
`... already bookmarked` message and `data: null` (`onConflictDoNothing`).

### Bookmark a Project

```
POST /api/v1/create/bookmark/project
```

**Headers:** `Authorization: Bearer <session_token>` · Body: `{ "public_id": "string (1–21)" }`

Any existing project (own or чужой) can be bookmarked.

- `200 "Project bookmarked"`, `data` = bookmark row; or `200 "Project already bookmarked"`, `data: null`
- `404 "Project not found"`

### Bookmark a Part

```
POST /api/v1/create/bookmark/part
```

Body: `{ "public_id": "string (1–21)", "part_id": "UUID" }`. The part must
belong to the given project.

- `200 "Part bookmarked"` / `"Part already bookmarked"` (`data` bookmark or `null`)
- `404 "Project not found"` · `404 "Part not found"`

### List Bookmarks

```
GET /api/v1/read/bookmarks?type=projects&limit=10&cursor=<bookmark_uuid>
GET /api/v1/read/bookmarks?type=parts&limit=10&cursor=<bookmark_uuid>
```

**Headers:** `Authorization: Bearer <session_token>`

| Query | Required | Description |
|---|---|---|
| `type` | ✅ Yes | `'projects'` or `'parts'` |
| `cursor` | No | Bookmark UUID for keyset pagination (`id < cursor`, `id DESC`); `nextCursor` is a bookmark ID or `null` |
| `limit` | No | 1–50 (default `10`) |

A manual guard also returns `400 "Invalid bookmark type"` with
`errors: ["type must be 'parts' or 'projects'"]` when `type` is anything else.

**Response `type=projects` (200 `"Project bookmarks retrieved"`):**

```json
{
  "success": true,
  "message": "Project bookmarks retrieved",
  "data": {
    "items": [
      {
        "id": "uuid",
        "createdAt": "ISO8601",
        "project": {
          "id": "uuid",
          "publicId": "string",
          "name": "string",
          "description": "string|null",
          "glbFileUrl": "string",
          "unlisted": true,
          "createdAt": "ISO8601",
          "updatedAt": "ISO8601"
        }
      }
    ],
    "nextCursor": null,
    "hasMore": false
  },
  "code": 200
}
```

**Response `type=parts` (200 `"Part bookmarks retrieved"`):**

```json
{
  "success": true,
  "message": "Part bookmarks retrieved",
  "data": {
    "items": [
      {
        "id": "uuid",
        "createdAt": "ISO8601",
        "part": {
          "id": "uuid",
          "partNumber": "string",
          "name": "string",
          "description": "string|null",
          "createdAt": "ISO8601",
          "updatedAt": "ISO8601"
        },
        "project": { "id": "uuid", "publicId": "string", "name": "string" }
      }
    ],
    "nextCursor": null,
    "hasMore": false
  },
  "code": 200
}
```

### Remove a Project Bookmark

```
DELETE /api/v1/delete/bookmark/project/:publicId
```

**Headers:** `Authorization: Bearer <session_token>`

- `200 "Project bookmark removed"`, `data: { id }`
- `400 "Invalid project identifier"` · `404 "Project not found"` · `404 "Project bookmark not found"`

### Remove a Part Bookmark

```
DELETE /api/v1/delete/bookmark/part/:partId
```

**Headers:** `Authorization: Bearer <session_token>`

- `200 "Part bookmark removed"`, `data: { id }`
- `400 "Invalid part identifier"` · `404 "Part bookmark not found"`

---

## Users

### Get User Profile (Public)

```
GET /api/v1/read/user?username=<username>
```

Public. `username`: required, 1–30 chars, `[A-Za-z0-9_-]+`.

**Response (200):**

```json
{
  "success": true,
  "message": "User profile retrieved",
  "data": {
    "id": "uuid",
    "username": "string",
    "name": "string",
    "avatarUrl": "string|null",
    "createdAt": "ISO8601",
    "totalProjects": 0
  },
  "code": 200
}
```

> `totalProjects` counts only `unlisted = false` projects. Errors: `404 "User not found"`.

### List a User's Public Projects

```
GET /api/v1/read/user/projects?username=<username>&limit=10&cursor=<project_uuid>
```

Public. Only `unlisted = false` projects, `id DESC`. Keyset pagination:
`cursor` is a project UUID (`id < cursor`); `nextCursor` is a project UUID or
`null`. `limit` 1–50, default `10`.

**Response (200 `"User projects retrieved"`):** `data: { items: [{ id,
publicId, name, description, glbFileUrl, unlisted, createdAt, updatedAt,
parts, views }], nextCursor, hasMore }`. Errors: `404 "User not found"`.

### Update Current User

```
PATCH /api/v1/update/user
```

**Headers:** `Authorization: Bearer <session_token>`

At least one of `username` (1–30, `[A-Za-z0-9_-]+`), `name` (1–70),
`avatar_url` (ImageKit image URL, max 512; must start with
`IMAGEKIT_URL_ENDPOINT` and end `.jpg/.jpeg/.png/.webp/.gif`; `HEAD` (5 s)
must return `image/jpeg|image/png|image/webp|image/gif`). `avatar_url` maps to
`avatarUrl`. `updatedAt` refreshed.

**Response (200 `"User updated"`):** `data: { id, username, name, email,
avatarUrl, createdAt, updatedAt }`.

Errors: `409 "Username already taken"` · `404 "User not found"`.

---

## File Upload

```
POST /api/v1/upload/:kind
```

Supported kinds: `glb`, `pdf`, `image`. Auth required. Passes through both
`generalRateLimit` and the stricter per-user `uploadRateLimit` (see
[Rate Limiting](#rate-limiting)).

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: multipart/form-data
```

**Form Field:** `file` (single file; `files: 1`, memory storage)

**Limits:**
- Max file size: **25 MB**
- Request timeout: **30 seconds** (`req.setTimeout`; destroys the request on fire)

Extension **and** MIME type must both match (checked in `fileFilter`):

### GLB Upload

```
POST /api/v1/upload/glb
```

Extensions: `.glb` · MIME: `model/gltf-binary`, `application/octet-stream`

### PDF Upload

```
POST /api/v1/upload/pdf
```

Extensions: `.pdf` · MIME: `application/pdf`

### Image Upload

```
POST /api/v1/upload/image
```

Extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif` · MIME: `image/jpeg`, `image/png`, `image/webp`, `image/gif`

**Response (200; message depends on kind):**

```json
{
  "success": true,
  "message": "GLB file uploaded successfully",
  "data": {
    "url": "https://ik.imagekit.io/xxx/partlens/glb/<nanoid>.glb",
    "fileId": "string"
  },
  "code": 200
}
```

(`"PDF file uploaded successfully"` / `"IMAGE file uploaded successfully"`
for the other kinds.)

**Error Responses:**

| Code | Message | Cause |
|---|---|---|
| 400 | `"A valid file is required in the file field"` | No file, or extension/MIME rejected by `fileFilter` |
| 400 | `"Invalid file type. Upload the expected file type in the file field"` | Other `MulterError` (e.g. too many files) |
| 413 | `"File exceeds the 25 MB upload limit"` | `LIMIT_FILE_SIZE` |
| 408 | `"Upload timed out"` | 30 s request timeout fired |
| 502 | `"File upload failed"` | ImageKit upload threw |
| 500 | `"File upload is not configured"` | Missing `IMAGEKIT_PRIVATE_KEY` |

> Files are uploaded to ImageKit folder `/partlens/{kind}/` with filename
> `<nanoid()><original-extension>`. Only `IMAGEKIT_PRIVATE_KEY` is used
> server-side for uploads.

---

## Rate Limiting

Full policy lives in `ratelimits.md`. Summary: `express-rate-limit` +
`rate-limit-redis` over the existing Redis client, fixed windows, every
request counted (including failures), lazy limiter init, `draft-8`
`RateLimit` headers, Redis store errors go to the Express error handler
(`500`), and `429` bodies are `{ success: false, message: "Too many
requests. Please try again later.", data: null, code: 429 }`.

| Scope | Limit | Key |
|---|---|---|
| `/api/v1/auth` | 20 / 15 min | client IP |
| `/api/v1/create`, `/delete`, `/read`, `/update`, `/upload` | 300 / min | client IP |
| `POST /api/v1/upload/{glb,pdf,image}` (additional) | 20 / hour | authenticated user ID (falls back to IP when unauthenticated) |

Uploads therefore pass through **both** the general and the per-user upload
limiter; missing/invalid sessions are rejected by `verifySession` before the
per-user quota is consumed.

---

## Error Responses

Validation failures (from `validate`):

```json
{
  "success": false,
  "message": "invalid request body",
  "errors": [
    { "msg": "field is required", "param": "name", "location": "body" }
  ],
  "code": 400
}
```

Note the lowercase `message`. Most route-level `400`/`404` errors instead use
`{ success: false, message, data: null, code }`; the `DELETE
/api/v1/delete/project/:publicId` `400` omits `data`.

| Status Code | Meaning / Example messages |
|---|---|
| 400 | Validation failure (`"invalid request body"` + `errors`); `"invalid request"`, `"invalid state"`, `"invalid callback code"` (auth); `"Invalid project identifier"`, `"Invalid part identifier"`, `"Invalid manual identifier"`, `"Invalid bookmark type"`; upload file errors |
| 401 | `"Unauthorized"` (missing/unknown/expired session); `"Invalid authorization header"` (non-`Bearer` or missing token) |
| 404 | `"No matching route found."` (unknown path); `"Project not found"`, `"Part not found"`, `"Manual not found"`, `"User not found"`, `"Project bookmark not found"`, `"Part bookmark not found"` |
| 408 | `"Upload timed out"` |
| 409 | `"A part with this part number already exists in the project"`, `"Username already taken"` |
| 413 | `"File exceeds the 25 MB upload limit"` |
| 429 | `"Too many requests. Please try again later."` (see `ratelimits.md`) |
| 500 | `"Internal server error"` (error handler); `"File upload is not configured"` |
| 502 | `"File upload failed"` (ImageKit) |
| 503 | Health check degraded (`success: false`, `healthy: false`) |

Missing manuals for a clicked part is not an error — endpoints return empty
`manuals: []`.

---

## Database Schema

IDs default to `uuidv7()`. Timestamps are `timestamptz` (`defaultNow()`).
FKs use `ON DELETE CASCADE`.

### `users`

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | `uuidv7()` |
| `google_id` | varchar(255), unique, not null | Google `sub` |
| `avatar_url` | varchar(512), nullable | Google picture |
| `email_verified` | boolean, not null, default `false` | From Google profile |
| `username` | varchar(30), unique, not null | `nanoid()` (21 chars) on OAuth signup; user-editable (`[A-Za-z0-9_-]+`) |
| `name` | varchar(70), not null | Not unique |
| `email` | varchar(254), unique, not null | From Google profile |
| `created_at` / `updated_at` | timestamptz | |

### `sessions`

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | `uuidv7()` |
| `user_id` | uuid FK → users, cascade | |
| `token_hash` | varchar(64), unique, not null | SHA-256 hex of the bearer token |
| `expires_at` | timestamptz, not null | Creation + 30 days |
| `created_at` | timestamptz | |
| `ip_address` | varchar(45), nullable | Max IPv6 length; refreshed on change |
| `user_agent` | varchar(512), nullable | Refreshed on change |
| `last_active` | timestamptz | Refreshed when stale (>15 min) or IP/UA changed |

Index on `user_id`.

### `projects`

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | `uuidv7()` |
| `public_id` | varchar(21), unique, not null | `nanoid()` (21 chars); public URL identifier |
| `user_id` | uuid FK → users, cascade | Owner |
| `name` | varchar(255), not null | |
| `description` | varchar(1000), nullable | |
| `glb_file_url` | varchar(2048), not null | ImageKit `.glb` URL |
| `unlisted` | boolean, not null, default `true` | `false` = public/discoverable |
| `created_at` / `updated_at` | timestamptz | |

Indexes on `user_id`, `unlisted`.

### `project_views`

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | |
| `project_id` | uuid FK → projects, cascade | |
| `ip` | varchar(45), not null | Viewer IP (`req.ip` or `"unknown"`) |
| `viewed_at` | timestamptz | Refreshed on repeat view |

> Unique index on `(project_id, ip)` — one row per IP per project. `GET
> /api/v1/read/project/:publicId` upserts this row after responding.

Index on `project_id`.

### `parts`

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | |
| `project_id` | uuid FK → projects, cascade | |
| `part_number` | varchar(255), not null | Unique per project (see below) |
| `name` | varchar(255), not null | |
| `description` | varchar(1000), nullable | |
| `created_at` / `updated_at` | timestamptz | |

> Unique index on `(project_id, part_number)` — duplicate numbers yield `409`.

Index on `project_id`.

### `part_manuals`

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | |
| `part_id` | uuid FK → parts, cascade | |
| `title` | varchar(255), not null | |
| `file_url` | varchar(2048), not null | ImageKit `.pdf` URL |
| `uploaded_at` | timestamptz | No `created_at`/`updated_at` on this table |

Index on `part_id`.

### `project_bookmarks`

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid FK → users, cascade | |
| `project_id` | uuid FK → projects, cascade | |
| `created_at` | timestamptz | |

> Unique index on `(user_id, project_id)` — re-bookmark is a no-op returning `"Project already bookmarked"`.

Index on `user_id`.

### `part_bookmarks`

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid FK → users, cascade | |
| `part_id` | uuid FK → parts, cascade | |
| `created_at` | timestamptz | |

> Unique index on `(user_id, part_id)` — re-bookmark returns `"Part already bookmarked"`.

Index on `user_id`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_URL` | ✅ | PostgreSQL connection string for `pg` Pool |
| `REDIS_URL` | ✅ | Redis connection URL |
| `REDIS_PREFIX` | ✅ (in practice) | Key prefix. Auth keys use it verbatim (`${REDIS_PREFIX}:auth:...`); rate limiters fall back to `partlens` when unset — keep it set and consistent across instances |
| `ADMIN_KEY` | No | Optional; when unset `/status` never includes `services` |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `FRONTEND_URL` | ✅ | OAuth callback redirect origin (`<FRONTEND_URL>/auth/callback?code=...`) |
| `BACKEND_URL` | ✅ | OAuth `redirect_uri` origin (`<BACKEND_URL>/api/v1/auth/google/callback`) |
| `IMAGEKIT_PUBLIC_KEY` | ✅ | ImageKit public key (client/frontend use) |
| `IMAGEKIT_PRIVATE_KEY` | ✅ | Required for `/upload/*`; missing key yields `500 "File upload is not configured"` |
| `IMAGEKIT_URL_ENDPOINT` | ✅ | Base URL that `file_url`/`avatar_url` must start with; validators fail with `... could not be validated` when unset |
| `NODE_ENV` | No | `trust proxy` enabled only in `production`; default `development` |
| `PORT` | No | Default `5050` |

---

## Middleware

### `verifySession`

Required auth for all non-public routes. Exact `401` bodies:
`{ success: false, message: "Unauthorized", code: 401 }` (missing / unknown /
expired token) and `{ success: false, message: "Invalid authorization
header", code: 401 }` (non-`Bearer` scheme or missing token). Refreshes
`ipAddress`/`userAgent`/`lastActive` as described in
[Session Verification](#session-verification).

### `isAuthenticated`

Optional-auth variant used only by `GET /api/v1/read/project/:publicId`.
Never sends an error; sets `req.isAuthenticated` and populates `req.user` /
`req.session` only on a valid session.

### `isAdminRequest`

Used only by `GET /status`. Compares the second header part against
`ADMIN_KEY` with `crypto.timingSafeEqual` (length mismatch → non-admin).
Missing/unset `ADMIN_KEY` → `req.isAdmin = false`, request still succeeds.

### `authRateLimit` / `generalRateLimit` / `uploadRateLimit`

See [Rate Limiting](#rate-limiting) and `ratelimits.md`. Redis-backed,
`429 { success: false, message: "Too many requests. Please try again later.",
data: null, code: 429 }`, `draft-8` headers.

### `validate`

Runs an `express-validator` chain array; on failure returns `400
{ success: false, message: "invalid request body", errors: errors.array(),
code: 400 }` (lowercase message).

### `errorHandler`

Final handler: logs and returns `500 { success: false, message: "Internal
server error", code: 500 }`. Redis store errors from rate limiters also land
here (`passOnStoreError: false`).

---

## Validators

### `createProjectValidator`

`POST /api/v1/create/project`: `name` (string, trimmed, 1–255;
`"name must not be empty"` when blank), `description` (optional/null, string,
trimmed, ≤1000), `file_url` (required, string, ≤2048, ImageKit `.glb` +
reachable `HEAD` as above), `unlisted` (**required** boolean —
`"unlisted must be a boolean"`).

### `updateProjectValidator`

`PATCH /api/v1/update/project/:publicId`: body must be non-empty
(`"at least one project field is required"`) with only `name`, `description`,
`file_url`, `unlisted` (`"request contains an unsupported project field"`).
Field rules mirror creation except all optional (`name` 1–255;
`description` ≤1000; `file_url` same GLB checks; `unlisted` boolean).

### `searchProjectsValidator`

`GET /api/v1/read/search/projects` query: `q` (required string, trimmed,
1–200), `limit` (optional int 1–50), `cursor` (optional non-negative int
offset).

### `discoverProjectsValidator`

`GET /api/v1/read/projects/discover` query: `sort` (optional,
`'top'|'newest'`), `limit` (optional int 1–50), `cursor` (optional
non-negative int offset).

### `createManualValidator`

`POST /api/v1/create/part`: `public_id` (required, 1–21 chars), `name` /
`part_number` (string, trimmed, 1–255), `description` (optional/null, ≤1000),
`file_urls` (required array; every element must be an object with `title` +
`file_url`), `file_urls.*.title` (1–255), `file_urls.*.file_url` (string,
≤2048, ImageKit `.pdf` + reachable `HEAD` with `application/pdf`).

### `createPartManualValidator`

`POST /api/v1/create/manual`: `part_id` (required UUID), `title` (1–255),
`file_url` (same PDF rules).

### `updatePartValidator`

`PATCH /api/v1/update/manual/:partId`: `partId` param must be UUID; body must
be non-empty with only `part_number`/`name`/`description`
(`"at least one part field is required"` /
`"request contains an unsupported part field"`).

### `deletePartValidator` / `deleteManualValidator`

`partId` / `manualId` params must be UUIDs.

### Bookmark validators

- `createProjectBookmarkValidator`: `public_id` (required, 1–21)
- `createPartBookmarkValidator`: `public_id` (required, 1–21) + `part_id` (required UUID)
- `deleteProjectBookmarkValidator`: `publicId` param (string, 1–21)
- `deletePartBookmarkValidator`: `partId` param (UUID)
- `listBookmarksValidator`: `type` (required, `'parts'|'projects'`), `cursor` (optional string UUID), `limit` (optional int 1–50)

### User validators

- `updateUserValidator`: body non-empty with only `username`/`name`/`avatar_url`; `username` (optional, 1–30, `/^[a-zA-Z0-9_-]+$/`), `name` (optional, 1–70), `avatar_url` (optional/null, ≤512, ImageKit image extension + reachable `HEAD` with `image/*`)
- `getUserProfileValidator`: `username` query (required, 1–30, same regex)
- `getUserProjectsValidator`: same `username` + `cursor` (optional string UUID) + `limit` (optional int 1–50)

---

## Running the Backend

```bash
cd backend

# Install dependencies
npm install

# Start development server (tsx watch, port 5050)
npm run dev

# Build to dist/
npm run build

# Run production server
npm start

# Database migrations
npm run db:migrate    # Run pending migrations
npm run db:generate   # Generate new migration
npm run db:push       # Push schema to database
```

`dev` runs `tsx watch --import dotenv/config src/index.ts` (dotenv
preloaded). On boot `initializeDatabase()` runs `SELECT 1`, then applies
migrations from `./drizzle`, and exits (`process.exit(1)`) on failure; Redis
connects before `app.listen(PORT)` (`PORT` default `5050`).
