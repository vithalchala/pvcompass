# PV Compass

Inspection readiness for a PV system.

PV Compass is a preparation library. It organises a pharmacovigilance system into 12 areas,
each with sub-areas and checks, and links every check to the regulations it rests on.

> **Preparation tool. Not a system of record. Not validated. No e-signatures.**

Stack: Next.js 15 (App Router, TypeScript), Drizzle ORM, local Postgres, Tailwind CSS v4,
cookie session login (iron-session). There is one admin user, whose password comes from
`ADMIN_PASSWORD`.

## Pages

| Route               | Purpose                                    |
| ------------------- | ------------------------------------------ |
| `/login`            | Admin sign-in                              |
| `/areas`            | The 12 PV areas                            |
| `/areas/[code]`     | Sub-areas and checks for one area          |
| `/regulations`      | Search (`?q=`) and jurisdiction filter (`?j=`) |
| `/regulations/[id]` | Full summary, tags, source, as-of date, citing checks |
| `/review`           | Area-by-area check approval (`?area=`)     |

Every route except `/login` needs a session.

## 1. Local Postgres

macOS (Homebrew):

```bash
brew install postgresql@17
brew services start postgresql@17
createuser pvcompass --pwprompt   # enter: pvcompass
createdb pvcompass --owner pvcompass
```

Or with Docker:

```bash
docker run -d --name pvcompass-db -p 5432:5432 \
  -e POSTGRES_USER=pvcompass -e POSTGRES_PASSWORD=pvcompass -e POSTGRES_DB=pvcompass \
  postgres:17-alpine
```

## 2. Environment variables

Copy the example and edit it:

```bash
cp .env.example .env.local
```

| Variable         | Required | Description                                                                                    |
| ---------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `DATABASE_URL`   | yes      | e.g. `postgres://pvcompass:pvcompass@localhost:5432/pvcompass`                                 |
| `ADMIN_PASSWORD` | yes      | Password for the single admin user                                                             |
| `SESSION_SECRET` | no       | 32+ characters, used to sign the session cookie. If unset, a key is derived from `ADMIN_PASSWORD` |

`.env.local` is git-ignored. The Drizzle config and the seed script read it too.

## 3. Install, create tables, load data

```bash
npm install
npm run db:push               # create tables from src/db/schema.ts
npm run db:seed               # areas + checks, and regulations from data/regulations.json
```

### Regulations data

Regulations come only from `data/regulations.json`: a JSON array of objects with these fields.

| Field          | Type             | Required |
| -------------- | ---------------- | -------- |
| `id`           | string, unique   | yes      |
| `title`        | string           | yes      |
| `jurisdiction` | string           | yes      |
| `summary`      | string           | yes      |
| `as_of`        | `YYYY-MM-DD`     | yes      |
| `section`      | string or null   | no       |
| `source_label` | string or null   | no       |
| `tags`         | array of strings | no       |

After editing the file, reload just the regulations (review status on checks is kept):

```bash
npm run db:load-regulations
```

The loader checks the whole file first and refuses to load anything if an entry is invalid. It
adds and updates entries, deletes ids no longer in the file, and sets the corpus as-of date to
the newest `as_of`. Search is plain substring matching over id, title, summary, section, source
label and tags. No AI is involved.

The areas and checks in `src/db/seed-data.ts` are an illustrative starter set (12 areas,
48 checks). A check links to a regulation only when its id exists in the JSON file; the seed
reports how many links it skipped. `npm run db:seed` wipes review status.

## 4. Run

```bash
npm run dev
```

Open http://localhost:3000 and sign in with `ADMIN_PASSWORD`.

Other scripts: `npm run build`, `npm start`, `npm run typecheck`, `npm run db:generate`
(SQL migrations into `drizzle/`), `npm run db:studio`.

## Layout

```
src/
  app/
    login/            sign-in page and server actions
    (app)/            authenticated shell: as-of line, masthead, nav, caution box
      areas/  regulations/  review/
  components/ui.tsx   shared visual primitives (§ labels, numbered items, caution)
  db/                 schema, client, seed
  lib/                session + queries
  middleware.ts       redirects to /login without a valid session
```

## Visual rules

White page, near-black text (`#141518`), muted grey for secondary text. Inter for UI,
IBM Plex Mono for codes, numbers and `§` section labels. No gradients, shadows or icon sets.

## Out of scope

No 21 CFR Part 11 controls, no electronic signatures, no file upload. Approvals record
preparation status only.

## Domain

The production domain will be `pvcompass.info`. DNS is not configured yet.
