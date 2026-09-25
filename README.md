# PartLens

## About
PartLens is an documentation platform mainly aimed at documenting 3d machine diagrams by uploading manuals. 3D glb file of machine is uploaded into the system, then you can upload manuals/pdfs for a specific part in that machine.

Our system allows you to click on a machine part and inside the 3D render icon and it would automatically select it.

## Techstack
Nextjs, with an express backend. Postgresql for datastoring with drizzle. And redis to store certain values for fast access with expiry + caching and ratelimiting.

## Deploying

### Prerequisites

- Node.js 20+ and npm
- PostgreSQL database (`POSTGRES_URL`)
- Redis instance (`REDIS_URL`)
- ImageKit account (`IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`)
- Google OAuth client (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)

Services run locally on:

- Backend: `http://localhost:5050`
- Frontend: `http://localhost:3000`

### 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `.env` (see `backend/.env.example` and `backend/api_docs.md` for details):

```text
POSTGRES_URL=
REDIS_URL=
REDIS_PREFIX=
ADMIN_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5050
IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
IMAGEKIT_URL_ENDPOINT=
PORT=5050
NODE_ENV=development
```

In the Google Cloud Console, add this OAuth redirect URI:

```text
http://localhost:5050/api/v1/auth/google/callback
```

Then apply migrations and start the dev server (auto-applies migrations on boot, port `5050`):

```bash
npm run db:migrate
npm run dev
```

Verify: `GET http://localhost:5050/status`

Other backend commands:

```bash
npm run build   # compile TypeScript to dist/
npm start       # run compiled server (production)
npm run db:generate  # generate a migration from schema changes
npm run db:push      # push schema directly (dev only)
```

### 2. Frontend setup

The frontend uses hardcoded URLs in `frontend/src/vars/vars.tsx`:

```ts
BACKEND_URL: 'http://localhost:5050'
FRONTEND_URL: 'http://localhost:3000'
```

For local development the defaults work as-is. For production, update both values to your deployed URLs before building.

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Development startup order

1. Start PostgreSQL and Redis.
2. Start backend (`cd backend && npm run dev`).
3. Start frontend (`cd frontend && npm run dev`).

### Production deployment

1. Provision managed PostgreSQL and Redis, plus ImageKit and Google OAuth credentials.
2. Set backend environment variables with production values:
   `NODE_ENV=production`, public `FRONTEND_URL` / `BACKEND_URL`, real `POSTGRES_URL`, `REDIS_URL`, ImageKit and Google keys, strong `ADMIN_KEY`.
   The backend sets `trust proxy` automatically when `NODE_ENV=production`.
3. Add the production OAuth redirect URI in Google Cloud Console:
   `https://<your-backend>/api/v1/auth/google/callback`
4. Deploy backend:
   ```bash
   cd backend
   npm install
   npm run build
   npm run db:migrate
   npm start
   ```
5. Deploy frontend: update `frontend/src/vars/vars.tsx` to your public `BACKEND_URL` / `FRONTEND_URL`, then:
   ```bash
   cd frontend
   npm install
   npm run build
   npm start
   ```
   Or host the frontend on Vercel/another Node host serving `next start` on port `3000`.
6. Verify production: `GET https://<your-backend>/status` and load the frontend URL, then test Google login and a GLB/PDF upload.

## Contributing
Got any contributions? Please open a pull request.