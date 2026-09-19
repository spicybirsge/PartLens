# PartLens — AGENTS.md

## 1. Project Overview

PartLens is an open-source interactive 3D parts catalog and technical documentation platform.

The core idea is:

> A user uploads a machine's 3D model (`.glb`) and its technical manuals (`.pdf`). Users can interact with the 3D model, click a machine part, and retrieve the manuals associated with that part.

The platform is intended to be usable by anyone, not tied to a single company.

A typical machine looks like:

```text
Machine
├── 3D GLB model
├── Parts
└── Manuals
    ├── Manual → Part A
    ├── Manual → Part B
    └── Manual → Part C
```

note: machines are also called projects, when programming and in the dashboard we use the term "project(s)" to refer to it, we dont use the term machine.

The application has two major sides:

1. **Public catalog**

   * Search public machines and manuals
   * View public machine pages
   * Interact with 3D models
   * Click parts to find relevant manuals
   * View manuals
   * Optionally bookmark machines/manuals

2. **Authenticated dashboard**

   * Create machines
   * Upload GLB models
   * Edit machine information
   * Set machines to public/unlisted
   * Upload PDFs
   * Associate PDFs with parts
   * Delete/update machines and manuals
   * View/manage owned machines

---

# 2. Core Product Flow

## Anonymous user

When a user visits the application without being authenticated:

```text
Landing page
    ↓
Search
    ↓
Top 10 most-viewed public machines
    ↓
Public machine
    ↓
Interactive 3D model
    ↓
Click a part
    ↓
Retrieve manuals associated with that part
```

The anonymous landing page should primarily function as a searchable public catalog.

## Authenticated user

When a user is authenticated:

```text
Login
    ↓
Dashboard
    ↓
My Machines
    ↓
Create/manage machine
    ↓
Upload GLB
    ↓
Upload manuals
    ↓
Associate manuals with GLB part names
```

---

# 3. Tech Stack

## Frontend

* Next.js
* React
* TypeScript
* Three.js
* `@react-three/fiber`
* `@react-three/drei`
* shadcn/ui where appropriate

## Backend

* Express
* Node.js
* TypeScript

## Database

* PostgreSQL
* Drizzle ORM

## Authentication

* Session-based authentication
* Google OAuth
* Sessions stored server-side
* Do not use JWT-based authentication for the main application auth unless the architecture is explicitly changed later.

## File storage

All uploaded files are stored in **ImageKit**.

Files include:

* `.glb` 3D models
* `.pdf` manuals/documents

PostgreSQL stores metadata and references to the files.

Do not store large GLB/PDF binary data directly in PostgreSQL.

---

# 4. Important 3D Model Convention

PartLens uses `.glb`/glTF models.

For the MVP:

> The GLB object's `name` property is treated as the part identifier.

Example:

```text
HYD-PUMP-001
VALVE-001
GEARBOX-001
ENGINE-001
```

A GLB might contain objects such as:

```text
Machine
├── HYD-PUMP-001
├── VALVE-001
├── GEARBOX-001
└── ENGINE-001
```

When the user clicks a model object:

```ts
event.object.name
```

is used as the part identifier.

Conceptually:

```text
GLB object.name
       ↓
    partId
       ↓
Express API
       ↓
PostgreSQL
       ↓
Manuals associated with that part
```

### Important

`name` is a standard glTF node property.

`partId` is an application-level concept, not a universal glTF property.

The database/API should therefore use terminology such as `partId` where appropriate, even though the MVP obtains it from `object.name`.

This keeps the architecture flexible if PartLens later supports richer metadata such as glTF `extras` or another CAD-to-GLB metadata convention.

---

# 5. GLB Upload Expectations

Users can upload arbitrary GLB files.

Do not assume every uploaded model has useful part names.

Possible uploaded models may contain:

```text
HYD-PUMP-001
VALVE-001
```

but others may contain:

```text
Object_001
Object_002
Cube
Mesh
```

or may contain a single combined mesh.

For the MVP, do not attempt to automatically repair or segment arbitrary CAD models.

The platform should simply use the names present in the GLB.

When a manual is uploaded, the user specifies the part name it refers to.

If that part name does not exist in the GLB, the manual can still be stored.

Example:

```text
GLB:
HYD-PUMP-001

Manual:
part_name = HYD-PUMP-999
```

This does not need to produce an error.

The manual simply will not be returned when `HYD-PUMP-001` is clicked.

Later versions may validate or display detected GLB parts.

---

# 6. Machine Visibility

Every machine has one of two visibility states:

```text
unlisted: Boolean
```

## Unlisted: false

if it is not unlisted, then it is a public machine that is shown in search results when relevant or is in top 10 most viewed:

* Appears in search results
* Can appear on the public landing page
* Can be viewed by anyone
* Can be accessed through its machine URL

## Unlisted: true

An unlisted machine:

* Does not appear in search results
* Does not appear in public machine discovery
* Can still be accessed by anyone who has its URL

Summary: can only be shared via URL wont show in the system public search or any listing except users dashboard to manage it

A machine URL uses a NanoID.

Example:

```text
/machine/7Kx92Lm
```

Do not expose uuidV7 database ID as public machine identifiers.

---

# 7. Page Views

A seperate table will be created for storing project views. We will store the users ip, project id and lastViewedAt.It will be updated when reading the project via public endpoint. If user has already viewed it just update that records lastViewedAt to current timestamp

---

# 8. Users and Profiles

Users can:

* Create an account
* Log in with Google
* Have a public profile
* Create machines
* Manage their own machines
* Optionally bookmark machines/manuals

A public profile should show the user's public machines.

Conceptually:

```text
/profile/:username

User
Name
Username
avatarURL

Machines
├── Machine A
├── Machine B
└── Machine C
```

Only public machines should be discoverable through the profile.

Unlisted machines should not be exposed through public discovery.

---

# 9. Manuals

Manuals are PDF documents associated with a machine.

Each manual should contain metadata similar to:

```text
id
machine_id
title
description
part_name
file_url
created_at
updated_at
```

Example:

```text
Hydraulic Pump Service Manual
Part: HYD-PUMP-001
PDF: ImageKit URL
```

A machine can have multiple manuals.

A part can have multiple manuals.

Therefore, do not assume one manual per part.

Example:

```text
HYD-PUMP-001
├── Installation Manual
├── Maintenance Manual
└── Troubleshooting Manual
```

---

# 10. Manual Retrieval

The most important application interaction is:

```text
User clicks 3D object
        ↓
object.name
        ↓
partId
        ↓
API request
        ↓
Find manuals for machine + part
        ↓
Return matching manuals
```

The machine ID must be part of the lookup.

Do not search globally for a part name because different machines may reuse the same part identifiers.

Conceptually:

```sql
SELECT *
FROM manuals
WHERE machine_id = $1
AND part_name = $2;
```

---

# 11. Search

Search should support at least:

## Machines

Search:

* Machine name
* Machine description

## Manuals

Search:

* Manual title
* Manual description
* Part name

The MVP does not need semantic/vector search.

Start with PostgreSQL search capabilities appropriate for the scale of the application.

PDF full-text search is a separate future enhancement.

Do not add embeddings, vector databases, or external search infrastructure unless there is an actual requirement.

---

# 12. Bookmarks

Bookmarks are optional and low priority.

Users may eventually bookmark:

* Other users' machines
* Manuals

Suggested tables:

```text
machine_bookmarks
-----------------
user_id
machine_id
created_at
```

```text
manual_bookmarks
----------------
user_id
manual_id
created_at
```

Do not prioritize bookmarks over the core 3D/documentation functionality.

---

# 13. Suggested Database Structure

The MVP database should roughly contain:

```text
users
-----
id
google_id
username
name
email
avatar_url
created_at
updated_at


sessions
--------
id
user_id
expires_at
created_at
updated_at
...


machines
--------
id
nanoid
owner_id
name
description
model_url
visibility
views
created_at
updated_at


manuals
-------
id
machine_id
title
description
part_name
file_url
created_at
updated_at
```

Bookmarks can later be added:

```text
machine_bookmarks
manual_bookmarks
```

Additional `parts` tables are not required for the simplest MVP if the GLB object's `name` is the part identifier.

If a real need emerges for explicit part metadata, introduce a `parts` table later.

Do not create tables simply because they might be useful someday.

---

# 14. API Architecture

Use Express as the backend API.

The frontend should not directly access PostgreSQL.

```text
Next.js
   ↓
Express API
   ↓
Drizzle
   ↓
PostgreSQL
```

For file uploads:

```text
Next.js
   ↓
Express
   ↓
ImageKit
```

or another explicitly designed secure upload flow if ImageKit's upload architecture makes that preferable.

Keep database access inside the backend.

---

# 15. Ownership and Authorization

A user must only be able to modify machines they own.

For example:

```text
PATCH /machines/:id
DELETE /machines/:id
POST /machines/:id/manuals
```

must verify that the authenticated user owns the machine.

Never rely only on the frontend to hide buttons.

Authorization must be enforced server-side.

Example conceptual check:

```text
authenticated user
        ↓
machine
        ↓
machine.owner_id === user.id
        ↓
allow mutation
```

Public read access and authenticated ownership are separate concerns.

---

# 16. File Handling

All uploaded files go to ImageKit.

PostgreSQL should store:

```text
file URL
file identifier if required
file metadata if required
```

Do not store:

```text
PDF binary
GLB binary
```

inside PostgreSQL.

When deleting a machine, clean up associated files from ImageKit where possible.

A machine deletion should remove:

```text
Machine database record
        ↓
Associated manual records
        ↓
GLB from ImageKit
        ↓
PDFs from ImageKit
```

Use database foreign keys/cascades for relational cleanup where appropriate.

File-storage cleanup must be handled separately because PostgreSQL cascading deletes cannot delete ImageKit files.

---

# 17. Frontend Architecture

Prefer reusable components over putting the entire application into one component.

Potential structure:

```text
src/
├── app/
│   ├── page.tsx
│   ├── login/
│   ├── dashboard/
│   ├── machine/
│   └── profile/
│
├── components/
│   ├── 3d/
│   │   ├── ModelViewer.tsx
│   │   ├── Machine.tsx
│   │   └── ...
│   ├── machines/
│   ├── manuals/
│   ├── search/
│   └── ui/
│
├── lib/
│   ├── api/
│   ├── auth/
│   └── ...
│
└── ...
```

The exact structure can change as the project grows.

Do not create abstractions purely for the sake of having abstractions.

---

# 18. Current 3D Viewer

The 3D viewer uses:

* `Canvas`
* `useGLTF`
* `OrbitControls`
* `Environment`
* `Bounds`

The current prototype loads:

```text
/models/machine.glb
```

The viewer should support:

* Orbiting
* Zooming
* Panning where appropriate
* Clicking individual objects
* Detecting `object.name`
* Reporting the selected part to the surrounding UI

Normal HTML elements must remain outside the R3F `<Canvas>` unless they are intentionally implemented using R3F-compatible mechanisms.

Do not put normal HTML elements such as:

```tsx
<div>
<strong>
<button>
```

directly inside `<Canvas>`.

---

# 19. Current Prototype State

The existing prototype already demonstrates:

1. Loading a GLB
2. Rendering it with React Three Fiber
3. Clicking model objects
4. Reading `event.object.name`
5. Displaying the selected part
6. Displaying dummy manual cards
7. Basic manual search can be added client-side for the prototype

The dummy manuals currently use part identifiers such as:

```text
HYD-PUMP-001
VALVE-001
GEARBOX-001
ENGINE-001
```

These are test data only.

They should eventually be replaced by PostgreSQL/API data.

---

# 20. MVP Priority

The most technically important feature is:

```text
3D model
    ↓
Part selection
    ↓
Part identifier
    ↓
Backend lookup
    ↓
Relevant manuals
    ↓
PDF viewing
```

Prioritize this vertical slice before spending significant time on secondary features.

Recommended implementation order:

### Phase 1 — 3D prototype

* Load GLB
* Click objects
* Read object names
* Highlight selected object if useful
* Display selected part

### Phase 2 — Backend/database

* Set up PostgreSQL
* Set up Drizzle
* Create machines/manuals/users schema
* Create Express API
* Connect frontend to API

### Phase 3 — File storage

* ImageKit integration
* GLB upload
* PDF upload
* File deletion

### Phase 4 — Core machine functionality

* Create machine
* Update machine
* Delete machine
* Public/unlisted visibility
* NanoID URLs
* Page views

### Phase 5 — Documentation interaction

* Upload manual
* Associate manual with part name
* Click part → API lookup → relevant manuals
* View PDF

### Phase 6 — Authentication

* Google login
* Sessions
* Protected dashboard
* Ownership checks

### Phase 7 — Public catalog

* Landing page
* Search
* Top 10 most-viewed public machines
* Public profiles
* Public machine pages

### Phase 8 — Optional features

* Machine bookmarks
* Manual bookmarks
* Better search
* PDF text search
* Analytics
* Part metadata
* Admin/moderation

---

# 21. MVP Non-Goals

Do NOT add these unless specifically requested:

* Microservices
* Kubernetes
* GraphQL
* Redis without a demonstrated need
* Vector database
* AI document analysis
* AI-generated manuals
* Automatic CAD segmentation
* Complex organization/team permissions
* Complex RBAC
* Billing/subscriptions
* Enterprise multi-tenancy
* Real-time collaboration
* Sophisticated analytics
* Complex event-driven architecture
* Multiple storage providers
* Multiple authentication providers beyond the MVP requirement
* Native mobile applications

The goal is a working, understandable open-source application.

---

# 22. Coding Principles

## Keep the architecture understandable

Prefer:

```text
Next.js → Express → PostgreSQL
```

over unnecessary layers.

## Avoid overengineering

Before introducing a dependency, abstraction, service, queue, cache, or database, ask:

> Does the current MVP actually need this?

If not, don't add it.

## Security still matters

Do not sacrifice basic security for simplicity.

Always consider:

* Authentication
* Authorization
* Input validation
* File type validation
* File size limits
* Upload security
* SQL injection protection through the ORM/query parameterization
* Rate limiting where appropriate
* Secure session handling
* Ownership checks

## Don't blindly trust client input

For example:

```text
POST /machines/:id/manuals
```

must not trust the client saying that it owns the machine.

The server must verify ownership.

---

# 23. TypeScript

Use TypeScript throughout the application where practical.

Prefer explicit types for:

* API request/response objects
* Database-related domain objects
* Component props
* Authentication/session objects

Avoid using `any` unless there is a genuine library/type limitation.

For example, the current Three.js click handler may temporarily use:

```ts
(event: any)
```

while prototyping, but it should eventually use the appropriate Three.js/R3F event type.

---

# 24. API Response Design

Keep API responses predictable.

For example:

```json
{
  "success":true,
  "message":"anything relevant to the request",
  "data":"data or any related field",
  "code":200
}
```

for successful requests where a wrapper is useful, and a consistent error structure such as:


```json
{
  "success":false,
  "message":"error",
  "data":null,
  "errors": ["error"]
  "code":400
}

```

Do not introduce a complicated response abstraction unless the project actually needs it.

---

# 25. Error Handling

The application should gracefully handle:

* Missing machines
* Missing manuals
* Invalid NanoIDs
* Unauthorized access
* Non-existent part names
* Invalid uploads
* Failed ImageKit uploads
* Failed database operations
* Invalid GLB files
* Corrupt/unreadable PDFs

A missing manual for a clicked part is not necessarily an error.

For example:

```text
User clicks:
VALVE-001

No manual exists.

Result:
"No documentation available for this part."
```

That is a valid application state.

---

# 26. 3D Performance

3D models can be large.

Avoid unnecessary processing on every render.

Prefer:

* GLB/glTF
* Compressed/optimized models where practical
* Proper disposal/cleanup
* Reasonable rendering resolution
* Lazy loading where useful
* Avoiding unnecessary React state updates

Do not prematurely implement complex 3D optimization.

Measure first when possible.

---

# 27. UI Philosophy

The UI should feel like a technical/productivity application rather than a flashy gaming website.

Prioritize:

* Clear information hierarchy
* Good spacing
* Responsive layouts
* Readable technical identifiers
* Simple upload workflows
* Clear machine/manual relationships
* Good 3D viewer usability

The 3D model is the primary interaction, not decoration.

---

# 28. When Modifying Existing Code

Before changing code:

1. Understand the existing implementation.
2. Preserve working functionality.
3. Make the smallest change that solves the problem.
4. Avoid unrelated refactoring.
5. Do not introduce new dependencies unless necessary.
6. Check how the change affects the API/database/frontend boundaries.
7. Keep TypeScript types accurate.

Do not rewrite large portions of the project simply because another architecture could theoretically be cleaner.

---

# 29. Agent Behavior

When working on this repository:

* Read this `AGENTS.md` first.
* Inspect the relevant existing code before making changes.
* Follow the existing architecture unless there is a concrete reason to change it.
* Do not invent APIs, database tables, or environment variables without explaining why they are needed.
* Do not replace working code with generated boilerplate unnecessarily.
* Do not add features outside the requested task.
* Do not assume that a future feature needs to be implemented now.
* Prefer incremental changes.
* If a task requires a significant architectural decision, explain the tradeoff before making a large change.
* If something is ambiguous, inspect the codebase and existing conventions before asking unnecessary questions.
* Never silently change the core data model.

---

# 30. Definition of MVP Completion

The MVP is considered functionally complete when a new user can:

```text
Sign up / log in with Google
        ↓
Open dashboard
        ↓
Create a machine
        ↓
Enter name + description
        ↓
Upload GLB to ImageKit
        ↓
Choose public/unlisted
        ↓
Receive NanoID machine URL
        ↓
Open machine management
        ↓
Upload PDF manual
        ↓
Enter the GLB part name
        ↓
Save manual
        ↓
Open machine page
        ↓
Interact with 3D model
        ↓
Click a part
        ↓
Part name is extracted from GLB
        ↓
Backend finds matching manuals
        ↓
Relevant PDF manual appears
        ↓
User can view the manual
```

Additionally:

* Machines can be updated.
* Machines can be deleted.
* Manuals can be managed/deleted.
* Public machines can appear in search.
* Unlisted machines do not appear in search.
* Machine page views are tracked.
* The anonymous landing page shows/searches public machines.
* Authenticated users are taken to their dashboard.
* Files are stored in ImageKit.
* Users cannot modify machines they do not own.
* Inside the system we usually label machines and "projects" for api routes and database etc, do not use the term machine

Bookmarks are optional and should not block MVP completion.

IMPORTANT NOTE: sometimes the current implementation may not exactly match what is specified here due to changes in thinking or planning that occured while developing so ignore those differences, just use this for reference if anything sounds confusing simply ask me back, and refer the original prompt and see if it says anything about it.
