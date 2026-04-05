# SchoolMS — Exam-Focused School Management System

A Next.js 14 application for managing the exam workflow in a school: classes, students, teachers, marks entry, merit lists, and published reports. Built with TypeScript, Prisma (PostgreSQL), and NextAuth.

---

## Prerequisites

Before you start, make sure you have these installed:

| Tool        | Minimum version | Check with          |
|-------------|-----------------|---------------------|
| **Node.js** | 20 or newer     | `node --version`    |
| **npm**     | 10 or newer     | `npm --version`     |
| **Docker**  | any recent      | `docker --version`  |
| **Docker Compose** | v2       | `docker compose version` |

> Docker is used to run PostgreSQL locally. You do **not** need to install Postgres separately.

---

## Quick start (5 commands)

From a fresh clone:

```bash
cp .env.example .env           # 1. create local env file
npm install                    # 2. install dependencies
docker compose up -d db        # 3. start PostgreSQL in Docker
npx prisma migrate deploy      # 4. create database tables
npm run seed                   # 5. seed sample data (admin, teacher, etc.)
npm run dev                    # start the dev server
```

Then open **http://localhost:3000** in your browser.

---

## Login credentials (from seed)

| Role    | Email                       | Password         |
|---------|-----------------------------|------------------|
| Admin   | `admin@schoolms.local`      | `AdminPass123`   |
| Teacher | `teacher@schoolms.local`    | `TeacherPass123` |

---

## Step-by-step, with explanations

### 1. Clone and enter the directory

```bash
git clone git@github.com:Tiko4Ted/school.git
cd school
```

### 2. Create your environment file

```bash
cp .env.example .env
```

The defaults in `.env.example` work out of the box for local development. You don't need to edit anything unless you want to change ports or secrets.

**What's in `.env`:**

- `DATABASE_URL` — points to the local Dockerized Postgres on port **55432**
- `NEXTAUTH_SECRET` — session secret (change for production)
- `NEXTAUTH_URL` — must match the URL you access the app on (`http://localhost:3000` by default)

### 3. Install dependencies

```bash
npm install
```

### 4. Start the database

```bash
npm run db:start
# or directly:
docker compose up -d db
```

This starts a PostgreSQL 16 container named `schoolms-db`. It exposes port **55432** on your host (chosen to avoid clashing with a native Postgres on 5432). Data lives in a Docker volume called `school_pgdata` and persists across restarts.

Verify it's running:

```bash
docker compose ps
```

You should see `schoolms-db` with status `healthy`.

### 5. Apply database migrations

```bash
npx prisma migrate deploy
```

This creates all the tables (User, School, Class, Stream, Subject, Student, Teacher, Exam, Mark, MeritList, PublishedReport, etc.).

### 6. Generate the Prisma client

```bash
npx prisma generate
```

> `prisma migrate deploy` usually runs this for you, but run it explicitly if you ever get "Prisma Client not found" errors.

### 7. Seed the database with sample data

```bash
npm run seed
```

This creates:
- 1 admin user + 1 teacher user
- 2 classes (Grade 7, Grade 8) with streams
- 2 subjects (Mathematics, English)
- 1 academic year with 1 term
- 1 sample student (`ADM-001` — Brian Otieno)
- 1 exam ("Opener Exam") configured for Mathematics
- Teacher assignment (Grade 7 North — Mathematics)

### 8. Run the dev server

```bash
npm run dev
```

Open **http://localhost:3000** and sign in with the credentials above.

---

## Available npm scripts

| Script               | What it does                                            |
|----------------------|---------------------------------------------------------|
| `npm run dev`        | Start Next.js dev server on port 3000                   |
| `npm run build`      | Production build                                        |
| `npm start`          | Run the production build                                |
| `npm test`           | Run the vitest test suite (unit + integration)          |
| `npm run seed`       | Seed sample data (safe to re-run; uses upsert)          |
| `npm run db:start`   | Start the Postgres container                            |
| `npm run db:stop`    | Stop the Postgres container (data persists)             |
| `npm run prisma:generate` | Regenerate the Prisma client                       |
| `npm run prisma:validate` | Validate `prisma/schema.prisma`                    |

---

## Running tests

```bash
npm test
```

Integration tests spin up a throwaway Postgres container via **testcontainers**, so Docker must be running. All 13 tests should pass.

---

## Project structure

```
school/
├── app/                 # Next.js App Router pages + API routes
│   ├── api/             # REST endpoints (auth, students, teachers, marks, ...)
│   ├── admin/           # Admin UI pages
│   └── teacher/         # Teacher UI pages
├── components/          # React components (UI)
├── lib/                 # Business logic + Prisma client + auth helpers
│   └── services/        # Domain services (marks, merit-lists, reports, ...)
├── prisma/
│   ├── schema.prisma    # Database schema
│   ├── migrations/      # SQL migrations
│   └── seed.ts          # Seed script
├── tests/               # vitest tests
├── docker-compose.yml   # Postgres dev database
└── .env.example         # Template environment file
```

---

## Troubleshooting

**"relation \"User\" does not exist" on `prisma migrate deploy`**
The migration state is corrupt. Reset it with:
```bash
npx prisma migrate reset --force
npm run seed
```
> This wipes the local dev database. Never run it against production.

**Port 3000 or 55432 already in use**
- Port 3000: stop whatever is using it, or run `npx next dev -p 3001` and update `NEXTAUTH_URL` in `.env` to match.
- Port 55432: edit the `ports:` block in `docker-compose.yml` and update `DATABASE_URL` in `.env` accordingly.

**`docker compose up` hangs pulling the image**
Check your internet / Docker Hub rate limits. Try `docker pull postgres:16-alpine` directly.

**Tests fail with "could not connect" or "Docker not available"**
Integration tests need Docker running (they use testcontainers).

---

## Tech stack

- **Next.js 14** (App Router, TypeScript)
- **PostgreSQL 16** (via Docker)
- **Prisma 6** (ORM + migrations)
- **NextAuth.js** (credentials-based auth, ADMIN / TEACHER roles)
- **Tailwind CSS 4**
- **Zod** (input validation)
- **Vitest + testcontainers** (testing)

---

## Roles & what they can do

**Admin**
- Manage classes, streams, subjects, terms, academic years
- Manage students (CRUD + lifecycle transitions + bulk CSV upload)
- Manage teachers + assignments (stream+subject, class teacher)
- Create exams, configure subjects per class
- Review marks, generate merit lists, publish/reopen reports

**Teacher**
- Enter and update marks **only** for their assigned stream+subject
- Cannot edit marks after an admin has reviewed them
- Cannot access any `/admin/*` pages
