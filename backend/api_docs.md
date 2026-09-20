# PartLens Backend API Documentation

> **Version:** 1.0.0  
> **Base URL:** `http://localhost:5050/api/v1`  
> **Protocol:** HTTPS (in production)  
> **Authentication:** Bearer session tokens (opaque random tokens stored server-side; not JWTs)
> **Database:** PostgreSQL via Drizzle ORM  
> **Cache:** Redis  
> **File Storage:** ImageKit

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Authentication](#authentication)
- [Health Check](#health-check)
- [Projects](#projects)
- [Parts](#parts)
- [Manuals](#manuals)
- [File Upload](#file-upload)
- [Error Responses](#error-responses)
- [Database Schema](#database-schema)
- [Environment Variables](#environment-variables)
- [Middleware](#middleware)
- [Validators](#validators)

---

## Architecture Overview

Session authentication uses opaque random bearer tokens stored server-side;
these tokens are not JWTs.

The backend is an **Express 5** server written in **TypeScript (ESM)** using the following stack:

| Component | Technology |
|---|---|
| Framework | Express 5 |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| Cache | Redis |
| File Upload | Multer → ImageKit |
| Auth | Google OAuth 2.0 + Session Tokens |
| Validation | express-validator |
| Logging | Morgan |

### Project Structure

```
backend/
├── src/
│   ├── index.ts                  # Entry point, routes mounting, middleware setup
│   ├── db/
│   │   ├── index.ts              # Drizzle pool & migration runner
│   │   └── schema.ts             # All table definitions
│   ├── middleware/
│   │   ├── verifySession.ts      # Bearer token → session/user resolution
│   │   ├── isAdminRequest.ts     # ADMIN_KEY timing-safe compare
│   │   ├── validate.ts           # express-validator runner
│   │   └── errorHandler.ts       # Generic 500 handler
│   ├── routes/v1/
│   │   ├── auth.ts               # Google OAuth, session management
│   │   ├── create.ts             # POST /project, /part, /manual
│   │   ├── read.ts               # GET /projects, /project/:id/*
│   │   ├── update.ts             # PATCH /project/:id, /manual/:partId
│   │   ├── delete.ts             # DELETE /project/:id, /part/:id, /manual/:id
│   │   └── upload.ts             # POST /upload/{glb,pdf,image}
│   ├── validators/
│   │   ├── project.validator.ts  # Project create/update validators
│   │   └── manual.validator.ts   # Part/manual validators
│   ├── redis/
│   │   └── redisClient.ts        # Redis client setup
│   └── types/
│       └── express.d.ts          # Express Request type augmentation
├── drizzle/                      # Migration files
├── .env                          # Environment configuration
├── package.json
└── tsconfig.json
```

---

## Authentication

### Google OAuth Flow

1. **Frontend** redirects user to `GET /api/v1/auth/google`
2. Backend generates a **32-byte random state**, stores it in Redis with a **10-minute TTL**, and redirects to Google's OAuth consent screen
3. Google redirects back to `GET /api/v1/auth/google/callback` with `code` and `state`
4. Backend validates the state against Redis, exchanges the code for tokens, fetches the user profile
5. A **new session** is created in PostgreSQL (30-day expiry) and a **callback token** is stored in Redis (60-second TTL)
6. Frontend is redirected to `/auth/callback?code=<callbackToken>`
7. Frontend exchanges the callback token for a session token via `POST /api/v1/auth/obtain-session`

### Obtain Session Token

```
POST /api/v1/auth/obtain-session
```

**Request Body:**

| Field | Type | Description |
|---|---|---|
| `callback_code` | string | The callback token received from the OAuth redirect |

**Response:**

```json
{
  "success": true,
  "message": "success",
  "token": "<session_token>",
  "code": 200
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "invalid callback code",
  "code": 400
}
```

> The returned `token` must be used as a **Bearer token** in the `Authorization` header for all subsequent requests.

### Start Google OAuth

```
GET /api/v1/auth/google
```

No authentication is required. This endpoint creates a short-lived OAuth
state in Redis and redirects the browser to Google's OAuth consent screen.

### Google OAuth Callback

```
GET /api/v1/auth/google/callback?code=<google_code>&state=<oauth_state>
```

Google calls this endpoint after consent. On success, the backend creates a
30-day session, stores a one-time callback code in Redis for 60 seconds, and
redirects to `<FRONTEND_URL>/auth/callback?code=<callback_code>`. Missing or
invalid `code` or `state` values return `400`.

### Get Current User

```
GET /api/v1/auth/me
```

**Headers:**

```
Authorization: Bearer <session_token>
```

**Response:**

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

**Response:**

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

**Response:**

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

**Response:**

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

> Expired sessions are automatically purged on this request. The `current` field marks the session making the request.

### Session Verification

All authenticated routes use the `verifySession` middleware, which:
1. Extracts the Bearer token from the `Authorization` header
2. SHA-256 hashes the token and looks it up in the `sessions` table
3. Rejects expired sessions (deletes them)
4. Refreshes `lastActive`, `ipAddress`, and `userAgent` if the IP/UA changed or it's been >15 minutes
5. Attaches `req.user` and `req.session` to the request object

---

## Health Check

The `ADMIN_KEY` is optional. The endpoint always returns basic health status;
when `ADMIN_KEY` is configured and the matching bearer value is supplied, the
response also includes per-service status in `services`.

```
GET /status
```

**Headers:** `Authorization: Bearer <admin_token>` (optional; detailed service info only shown to admins)

**Response (Admin):**

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

**Response (Non-Admin):**

```json
{
  "success": true,
  "message": "All systems operational",
  "healthy": true,
  "code": 200
}
```

> `ADMIN_KEY` is optional. Basic health status is available without it; when configured, the matching bearer token also includes the `services` object.

---

## Projects

Project management routes require authentication. The public project route
(`GET /api/v1/read/project/:publicId`) is the exception and does not require a
session; it can read either listed or unlisted projects when the public ID is
known.


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
| `name` | string | ✅ Yes | Project name (1–255 chars) |
| `description` | string | No | Project description (max 1000 chars) |
| `file_url` | string | ✅ Yes | ImageKit-hosted `.glb` URL |
| `unlisted` | boolean | No | Visibility flag (defaults to `true` in the database) |

**Validation:**
- `file_url` must start with `IMAGEKIT_URL_ENDPOINT` and end with `.glb`
- `file_url` must be reachable (HEAD request)

**Response:**

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
    "unlisted": boolean,
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

**Response:**

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
      "unlisted": boolean,
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

> Returns only projects owned by the authenticated user, ordered by `updatedAt` descending. Includes part counts and view counts per project.

### Get Project Details (Owner)

```
GET /api/v1/read/project/:publicId/details
```

**Headers:** `Authorization: Bearer <session_token>`

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `publicId` | string | NanoID public identifier (21 chars) |

**Response:**

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
    "unlisted": boolean,
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "code": 200
}
```

### Get Parts for a Project

```
GET /api/v1/read/project/:publicId/parts
```

**Headers:** `Authorization: Bearer <session_token>`

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `publicId` | string | NanoID public identifier |

**Response:**

```json
{
  "success": true,
  "message": "Project manuals retrieved",
  "data": {
    "project": { ... },
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

> Returns parts grouped by part, with their associated manuals. Ordered by manual upload date descending.

### Get Public Project (View Tracking)

```
GET /api/v1/read/project/:publicId
```

**Headers:** None required (public endpoint)

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `publicId` | string | NanoID public identifier |

**Response:**

```json
{
  "success": true,
  "message": "Project retrieved",
  "data": {
    "id": "uuid",
    "publicId": "string",
    "name": "string",
    "description": "string|null",
    "glbFileUrl": "string",
    "unlisted": boolean,
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601",
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
        "partNumber": "string",
        "name": "string",
        "description": "string|null",
        "createdAt": "ISO8601",
        "updatedAt": "ISO8601",
        "manuals": [...]
      }
    ]
  },
  "code": 200
}
```

> **Side effect:** An upsert is performed on the `project_views` table for the requesting IP address. This tracks unique views per project per IP.

### Update a Project

```
PATCH /api/v1/update/project/:publicId
```

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `publicId` | string | NanoID public identifier |

**Request Body** (all fields optional, at least one required):

| Field | Type | Description |
|---|---|---|
| `name` | string | Project name (1–255 chars) |
| `description` | string | Description (max 1000 chars) |
| `file_url` | string | New ImageKit `.glb` URL |
| `unlisted` | boolean | Visibility toggle |

**Validation:** `file_url` must start with `IMAGEKIT_URL_ENDPOINT` and end with `.glb`, and be reachable.

**Response:**

```json
{
  "success": true,
  "message": "Project updated",
  "data": { ...project },
  "code": 200
}
```

### Delete a Project

```
DELETE /api/v1/delete/project/:publicId
```

**Headers:** `Authorization: Bearer <session_token>`

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `publicId` | string | NanoID public identifier |

**Response:**

```json
{
  "success": true,
  "message": "Project deleted",
  "data": { "id": "uuid" },
  "code": 200
}
```

> Deleting a project cascades to delete all associated parts and manuals (via `ON DELETE CASCADE`).

---

## Parts

Parts belong to a project and can have multiple manuals (PDFs).

### Create a Part with Manuals

```
POST /api/v1/create/part
```

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `public_id` | string | ✅ Yes | Project's public identifier (21 chars) |
| `name` | string | ✅ Yes | Part name (1–255 chars) |
| `part_number` | string | ✅ Yes | Part number (1–255 chars) |
| `description` | string | No | Part description (max 1000 chars) |
| `file_urls` | array | ✅ Yes | Array of `{ title, file_url }` objects |

Each `file_urls` item:

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | ✅ Yes | Manual title (1–255 chars) |
| `file_url` | string | ✅ Yes | ImageKit PDF URL (must end with `.pdf`) |

**Validation:**
- Must belong to a project owned by the authenticated user
- `file_url` must start with `IMAGEKIT_URL_ENDPOINT` and end with `.pdf`
- Each URL must be reachable and return `content-type: application/pdf`
- If a part with the same `part_number` already exists, the manuals are appended to it

**Response:**

```json
{
  "success": true,
  "message": "Manual created successfully",
  "data": {
    "project": { ... },
    "part": {
      "id": "uuid",
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

### Create a Manual for an Existing Part

```
POST /api/v1/create/manual
```

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `part_id` | string (UUID) | ✅ Yes | Part identifier |
| `title` | string | ✅ Yes | Manual title (1–255 chars) |
| `file_url` | string | ✅ Yes | ImageKit PDF URL |

**Validation:**
- Part must belong to a project owned by the authenticated user
- `file_url` must start with `IMAGEKIT_URL_ENDPOINT`, end with `.pdf`, be reachable, and return `application/pdf`

**Response:**

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

### Update a Part

```
PATCH /api/v1/update/manual/:partId
```

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `partId` | UUID | Part identifier |

**Request Body** (at least one field required):

| Field | Type | Description |
|---|---|---|
| `part_number` | string | Part number (1–255 chars) |
| `name` | string | Part name (1–255 chars) |
| `description` | string | Part description (max 1000 chars) |

**Validation:** Only `part_number`, `name`, `description` fields are allowed.

**Response:**

```json
{
  "success": true,
  "message": "Part updated",
  "data": { ...part },
  "code": 200
}
```

### Delete a Part

```
DELETE /api/v1/delete/part/:partId
```

**Headers:** `Authorization: Bearer <session_token>`

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `partId` | UUID | Part identifier |

**Response:**

```json
{
  "success": true,
  "message": "Part deleted",
  "data": { "id": "uuid" },
  "code": 200
}
```

> Deleting a part cascades to delete all associated manuals.

### Delete a Manual

```
DELETE /api/v1/delete/manual/:manualId
```

**Headers:** `Authorization: Bearer <session_token>`

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `manualId` | UUID | Manual identifier |

**Response:**

```json
{
  "success": true,
  "message": "Manual deleted",
  "data": { "id": "uuid" },
  "code": 200
}
```

---

## File Upload

```
POST /api/v1/upload/:kind
```

Supported kinds: `glb`, `pdf`, `image`

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: multipart/form-data
```

**Form Field:** `file` (single file)

**Limits:**
- Max file size: **25 MB**
- Request timeout: **30 seconds**

### GLB Upload

```
POST /api/v1/upload/glb
```

Allowed extensions: `.glb`  
Allowed MIME types: `model/gltf-binary`, `application/octet-stream`

### PDF Upload

```
POST /api/v1/upload/pdf
```

Allowed extensions: `.pdf`  
Allowed MIME types: `application/pdf`

### Image Upload

```
POST /api/v1/upload/image
```

Allowed extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`  
Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`

**Response:**

```json
{
  "success": true,
  "message": "GLB file uploaded successfully",
  "data": {
    "url": "https://ik.imagekit.io/arma/path/file.glb",
    "fileId": "string"
  },
  "code": 200
}
```

**Error Responses:**

| Code | Message | Cause |
|---|---|---|
| 400 | "A valid file is required in the file field" | No file provided |
| 400 | "Invalid file type..." | Wrong file extension or MIME type |
| 413 | "File exceeds the 25 MB upload limit" | File too large |
| 408 | "Upload timed out" | Upload took longer than 30 seconds |
| 502 | "File upload failed" | ImageKit upload error |
| 500 | "File upload is not configured" | Missing `IMAGEKIT_PRIVATE_KEY` |

> Files are uploaded to ImageKit in the `/partlens/{kind}/` folder with a unique `nanoid` filename.

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "code": <HTTP_STATUS_CODE>
}
```

With optional `data` or `errors` fields:

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

| Status Code | Description |
|---|---|
| 400 | Invalid request body (validation failure) |
| 401 | Unauthorized (missing or invalid session token) |
| 404 | Resource not found |
| 408 | Upload timeout |
| 413 | File too large |
| 500 | Internal server error |
| 502 | File upload failed (ImageKit error) |
| 503 | Health check: some services down |

---

## Database Schema

### `users`

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Primary key, generated via `uuidv7()` |
| `google_id` | varchar(255) | Google OAuth ID, unique, not null |
| `avatar_url` | varchar(512) | Google profile picture URL |
| `email_verified` | boolean | Email verification status |
| `username` | varchar(30) | Auto-generated NanoID if not provided by Google |
| `name` | varchar(70) | Full name |
| `email` | varchar(254) | Email, unique |
| `created_at` | timestamp | Record creation time |
| `updated_at` | timestamp | Last update time |

### `sessions`

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Primary key |
| `user_id` | uuid (FK → users) | References user, cascade delete |
| `token_hash` | varchar(64) | SHA-256 hash of session token, unique |
| `expires_at` | timestamp | Session expiry (30 days) |
| `created_at` | timestamp | Record creation time |
| `ip_address` | varchar(45) | Client IP address (max IPv6) |
| `user_agent` | varchar(512) | Client user agent string |
| `last_active` | timestamp | Last activity timestamp |

### `projects`

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Primary key |
| `public_id` | varchar(21) | Public NanoID identifier, unique |
| `user_id` | uuid (FK → users) | Owner reference, cascade delete |
| `name` | varchar(255) | Project name |
| `description` | varchar(1000) | Project description |
| `glb_file_url` | varchar(2048) | ImageKit-hosted GLB file URL |
| `unlisted` | boolean | Visibility (default: `true`) |
| `created_at` | timestamp | Record creation time |
| `updated_at` | timestamp | Last update time |

### `project_views`

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Primary key |
| `project_id` | uuid (FK → projects) | References project, cascade delete |
| `ip` | varchar(45) | Viewer IP address |
| `viewed_at` | timestamp | View timestamp |

> Unique constraint on `(project_id, ip)` — one view per IP per project.

### `parts`

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Primary key |
| `project_id` | uuid (FK → projects) | References project, cascade delete |
| `part_number` | varchar(255) | Part identifier number |
| `name` | varchar(255) | Part name |
| `description` | varchar(1000) | Part description |
| `created_at` | timestamp | Record creation time |
| `updated_at` | timestamp | Last update time |

### `part_manuals`

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Primary key |
| `part_id` | uuid (FK → parts) | References part, cascade delete |
| `title` | varchar(255) | Manual title |
| `file_url` | varchar(2048) | ImageKit-hosted PDF URL |
| `uploaded_at` | timestamp | Upload timestamp |

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `POSTGRES_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `REDIS_PREFIX` | Key prefix for Redis namespaces | `partlens` |
| `ADMIN_KEY` | Secret key for admin health check | `randomauthsecret` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `GOCSPX-...` |
| `FRONTEND_URL` | Frontend origin URL | `http://localhost:3000` |
| `BACKEND_URL` | Backend origin URL | `http://localhost:5050` |
| `IMAGEKIT_PUBLIC_KEY` | ImageKit public key | `public_...` |
| `IMAGEKIT_PRIVATE_KEY` | ImageKit private key | `private_...` |
| `IMAGEKIT_URL_ENDPOINT` | ImageKit base URL for validation | `https://ik.imagekit.io/arma/` |
| `NODE_ENV` | Environment mode | `development` / `production` |
| `PORT` | Server port | `5050` |

---

## Middleware

### `verifySession`

Applied to all authenticated routes. Validates the Bearer token, resolves the user and session, and refreshes session metadata (IP, user-agent, lastActive).

### `isAdminRequest`

Applied to the `/status` health check endpoint. Compares the provided admin key against `ADMIN_KEY` using `crypto.timingSafeEqual`.

### `validate`

Wraps `express-validator` chains. Returns a 400 with validation errors if any rule fails.

### `errorHandler`

Catches unhandled errors and returns a generic 500 response.

---

## Validators

### `createProjectValidator`

Validates `POST /api/v1/create/project` request body: `name` (required, 1–255 chars), `description` (optional, max 1000), `file_url` (required, must be an ImageKit `.glb` URL, must be reachable), and `unlisted` (optional boolean; the database default is `true`).

### `updateProjectValidator`

Validates `PATCH /api/v1/update/project/:publicId` request body: at least one of `name`, `description`, `file_url`, `unlisted` required. `file_url` must be ImageKit `.glb` URL and reachable.

### `createManualValidator`

Validates `POST /api/v1/create/part` request body: `public_id` (required, 1–21 chars), `name`, `part_number` (1–255 chars each), `description` (optional, max 1000), `file_urls` (array of `{title, file_url}` objects, each `.pdf` ImageKit URL reachable).

### `createPartManualValidator`

Validates `POST /api/v1/create/manual` request body: `part_id` (valid UUID), `title` (1–255 chars), `file_url` (`.pdf` ImageKit URL reachable).

### `updatePartValidator`

Validates `PATCH /api/v1/update/manual/:partId` request body: `partId` must be valid UUID, body must contain at least one of `part_number`, `name`, `description`.

### `deletePartValidator`

Validates `DELETE /api/v1/delete/part/:partId`: `partId` must be valid UUID.

### `deleteManualValidator`

Validates `DELETE /api/v1/delete/manual/:manualId`: `manualId` must be valid UUID.

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


note: any agent reading this some apis maybe undocumented please then refer to the code always. Also fact check the api docs with the code at all times