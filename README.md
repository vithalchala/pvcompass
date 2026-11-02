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
npm run db:migrate            # create tables from drizzle/*.sql
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
| `as_of`        | `YYYY-MM` or `YYYY-MM-DD` | yes |
| `section`      | string or null   | no       |
| `source_label` | string or null   | no       |
| `tags`         | array of strings | no       |

Other fields (such as `subsection`) are ignored. The list is ordered by `section`, then title.

After editing the file, reload just the regulations (review status on checks is kept):

```bash
npm run db:load-regulations
```

The loader checks the whole file first and refuses to load anything if an entry is invalid. It
adds and updates entries, deletes ids no longer in the file, and sets the corpus as-of date to
the newest `as_of`. Search is plain substring matching over id, title, summary, section, source
label and tags. No AI is involved.

The areas and checks in `src/db/seed-data.ts` are an illustrative starter set (12 areas,
48 checks). Their citations point at ids in the current `data/regulations.json`; a check links to a regulation only when its id exists in the JSON file; the seed
reports how many links it skipped. `npm run db:seed` wipes review status.

## 4. Run

```bash
npm run dev
```

Open http://localhost:3000 and sign in with `ADMIN_PASSWORD`.

Other scripts: `npm run build`, `npm start`, `npm run typecheck`, `npm run db:studio`.

Schema changes: edit `src/db/schema.ts`, run `npm run db:generate` to write a new SQL
migration into `drizzle/`, commit it, then `npm run db:migrate`. (`npm run db:push` syncs a
local dev database directly, without a migration file.)

## Tests

```bash
npm test
```

Loader tests always run. Search tests run only when `TEST_DATABASE_URL` is set; they create
tables and replace all regulations in that database, so use a separate, empty one:

```bash
createdb pvcompass_test
TEST_DATABASE_URL=postgres://pvcompass:pvcompass@localhost:5432/pvcompass_test npm test
```

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

## Deploy (Railway)

The app and its Postgres run in one Railway project. `railway.json` sets the build, start and
pre-deploy steps; every deploy runs `npm run db:migrate` before the new version starts.

One-time setup:

1. In Railway, create a project from the GitHub repo and add a **PostgreSQL** database.
2. On the app service, set variables:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (a reference to the database service)
   - `ADMIN_PASSWORD` = a strong password
   - `SESSION_SECRET` = 32+ random characters (`openssl rand -hex 32`)
3. Under Networking, generate a Railway domain.
4. Load the starter data once, from your machine, against the database's public URL:

   ```bash
   DATABASE_URL="<Postgres DATABASE_PUBLIC_URL>" npm run db:seed
   ```

   Re-run `npm run db:load-regulations` the same way whenever `data/regulations.json` changes.

Pushes to `main` redeploy automatically.

## Domain

The production domain will be `pvcompass.info`. DNS is not configured yet; until then the site
is served on its Railway domain.
