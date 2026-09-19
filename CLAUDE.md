# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

PartLens — interactive 3D parts catalog + technical documentation platform. Two independent Node projects with no root package.json or shared tooling:

- `backend/` — Express API + PostgreSQL (Drizzle ORM) + Redis + ImageKit
- `frontend/` — Next.js 16 App Router client (React 19, @react-three/fiber, Zustand, shadcn/ui, Tailwind v4)

## Common commands

### Backend (`backend/`)
| command | script |
|---|---|
| `npm run dev` | `tsx watch` — reruns on change, port 5050 |
| `npm run build` | `tsc` → `dist/` |
| `npm start` | `node dist/index.js` |
| `npm run db:migrate` | `drizzle-kit migrate` |
| `npm run db:generate` | `drizzle-kit generate` |
| `npm run db:push` | `drizzle-kit push` |

No lint or test scripts are configured for the backend.

### Frontend (`frontend/`)
| command | script |
|---|---|
| `npm run dev` | `next dev` — port 3000 |
| `npm run build` | `next build` |
| `npm start` | `next start` |
| `npm run lint` | `eslint` |

No test scripts are configured for the frontend either.

### Running both
Open two terminals: `cd backend && npm run dev` and `cd frontend && npm run dev`.

## High-level architecture

### Backend (Express 5, ESM, TypeScript)
- `src/index.ts` — entrypoint; wires cors/morgan/express.json, mounts `/api/v1/{auth,create,read,update,delete,upload}`, `/status` admin healthcheck, 404 + error handlers
- `src/db/index.ts` — Drizzle node-postgres pool; runs migrations on startup
- `src/db/schema.ts` — `users`, `sessions`, `projects`, `project_views`, `parts`, `part_manuals`. Public identifiers are NanoID `public_id`; database UUIDs are never exposed
- `src/middleware/verifySession.ts` — Bearer token → SHA-256 hash → session lookup; attaches `req.user` + `req.session`; refreshes `lastActive` on IP/UA change
- `src/middleware/isAdminRequest.ts` — `ADMIN_KEY` timing-safe compare → `req.isAdmin`
- `src/middleware/validate.ts` — express-validator runner
- `src/middleware/errorHandler.ts` — generic 500
- `src/redis/redisClient.ts` — OAuth state nonce + callback tokens
- `src/routes/v1/auth.ts` — Google OAuth flow, session management (`/me`, `/logout`, `/logout-all`, `/sessions`)
- `src/routes/v1/create.ts` — `POST /project`
- `src/routes/v1/read.ts` — `GET /projects` (owner-scoped with part/view stats), `GET /project/:publicId/details` (owner), `GET /project/:publicId` (public; upserts `project_views` by IP)
- `src/routes/v1/update.ts` — `PATCH /project/:publicId`
- `src/routes/v1/delete.ts` — `DELETE /project/:publicId`
- `src/routes/v1/upload.ts` — multipart → ImageKit; GLB/PDF/image with extension+mime validation, 25 MB limit, 30 s timeout
- `src/validators/project.validator.ts` — field validation; HEAD-checks ImageKit URL and `.glb` extension for create/update
- `src/types/express.d.ts` — augments `Express.Request` (`isAdmin`, `user`, `session`)

### Frontend (Next.js 16 App Router)
- Pages: `/` (dashboard), `/login`, `/auth/callback`, `/new` (create project), `/manage/[id]` (scaffolded, not implemented)
- Zustand `userStore` — auth state + `localStorage` "token"
- API calls go directly to `BACKEND_URL` with `Authorization: Bearer <token>`
- R3F 3D: `GlbPreview` (preview card, cloned scene, OrbitControls, Bounds) and `ModelViewer` (prototype)
- shadcn/ui, Tailwind v4, `@/*` path alias, `next-themes`

### Auth flow
1. `GET /api/v1/auth/google` → redirect with Redis state (10 m TTL)
2. `GET /api/v1/auth/google/callback` → token exchange → upsert user → insert session → Redis callback token (60 s) → frontend redirect
3. Frontend `POST /api/v1/auth/obtain-session` → stores token in localStorage
4. Subsequent requests: `Authorization: Bearer <token>`; verifySession SHA-256 hashes token, checks expiry, refreshes `lastActive`

### Upload flow
Frontend multipart → `POST /api/v1/upload/glb` → backend → ImageKit → returns `{url, fileId}` → frontend `POST /api/v1/create/project` with `{name, description, file_url, unlisted}` → backend validates URL starts with `IMAGEKIT_URL_ENDPOINT`, ends `.glb`, and passes HEAD before insert.

## Important references
- `AGENTS.md` — canonical PartLens design doc (visibility rules, file handling, 3D conventions, MVP definition)
- `frontend/AGENTS.md` — Next.js 16 breaking-change warning; read `node_modules/next/dist/docs/` before writing frontend code
- `frontend/CLAUDE.md` — currently just `@AGENTS.md`
- `TODO.md` — current task list

## Notes
- No test framework configured in either `package.json`; running tests is not applicable yet
- `frontend/manage/[id]` route is not yet implemented
- Backend ESLint is installed but not configured (no config file, no lint script)
