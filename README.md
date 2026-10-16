# MyLeave

HR app for employees and admins. Data lives in Supabase Postgres. The site is set up to deploy on Netlify.

## 1. Create the Supabase database

1. Create a project at [supabase.com](https://supabase.com).
2. Open **Project Settings → Database → Connection string**.
3. Copy the **Transaction pooler** URI (port `6543`) into `DATABASE_URL`.
4. Copy the **Session pooler** URI (port `5432`) into `DIRECT_URL`.
5. Add `?pgbouncer=true&connection_limit=1&sslmode=require` to `DATABASE_URL` if those parameters are not already there.
6. Add `?sslmode=require` to `DIRECT_URL`.
7. If the database password contains `@`, `#`, or other reserved characters, URL-encode them.

Put the same values in `.env` for local development. `.env.example` shows the shape.

## 2. Create the tables and the first admin

Set these in `.env` before setup. The password is hashed and is not stored in the app:

- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_NAME`
- `INITIAL_ADMIN_PASSWORD` (8–72 characters, with a letter and a number)

```bash
npm install
npm run db:setup
npm run dev
```

`db:setup` creates empty tables and, only when no admin exists, one administrator. It does not add sample employees, leave, payslips, or requests. Add people from the admin Employees page. Running setup again does not replace existing records.

Open [http://localhost:3000](http://localhost:3000).

## 3. Deploy on Netlify

Netlify reads `netlify.toml`. The build generates the Prisma client, applies migrations, then builds Next.js.

In the Netlify site, set these environment variables for **Builds, Functions, and Edge**:

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET` (a random string of at least 32 characters)
- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_NAME`
- `INITIAL_ADMIN_PASSWORD`

Then either connect this folder’s Git repository, or from this folder:

```bash
npx netlify login
npx netlify init
npx netlify deploy --build --prod
```

The first production deploy creates the tables in Supabase. Create the first admin once, from your machine, with `npm run db:seed` after the connection variables and `INITIAL_ADMIN_*` values point at that project. That command does not insert sample staff and does not change an admin that already exists.
