# MyLeave

HR app for employees and admins. Leave, attendance, payslips, and requests are stored in Supabase Postgres. Local development uses Next.js. Production builds are set up for Netlify.

Requires Node.js 22 and npm.

## 1. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **Project Settings → Database → Connection string**.
3. Copy `.env.example` to `.env`.
4. Put the **Transaction pooler** URI (port `6543`, user `postgres.[PROJECT_REF]`) in `DATABASE_URL`.
5. Put the **Session pooler** URI (port `5432`, same pooler host and user) in `DIRECT_URL`.

Use the pooler host (`aws-0-[REGION].pooler.supabase.com`). The direct host (`db.[PROJECT_REF].supabase.co`) is often unreachable from a local network, and migrations fail with “can’t reach database server”.

`DATABASE_URL` must end with:

```text
?pgbouncer=true&connection_limit=5&sslmode=require
```

`DIRECT_URL` must end with:

```text
?sslmode=require
```

`pgbouncer=true` is required. Without it, check-in and other queries fail with `prepared statement "s0" already exists`.

If the database password contains `@`, `#`, or other reserved characters, URL-encode them.

Then set the app secrets in `.env`:

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | Session signing key. At least 32 random characters. Use a new value in production. |
| `INITIAL_ADMIN_EMAIL` | Email for the first admin account. |
| `INITIAL_ADMIN_NAME` | Full name for that account. |
| `INITIAL_ADMIN_PASSWORD` | 8–72 characters, with at least one letter and one number. Stored only as a hash. |
| `SLACK_WEBHOOK_URL` | Optional Slack incoming webhook. Leave requests, approvals, and the daily 8:00 IST “on leave today” note are posted there. |

Do not commit `.env`.

## 2. Create the tables and run the app

```bash
npm install
npm run db:setup
npm run dev
```

`db:setup` generates the Prisma client, applies every migration in `prisma/migrations`, then creates the first admin only when the database has no active admin. It does not add sample employees, leave, payslips, or requests. Running it again does not replace existing records.

Keep `prisma` and `@prisma/client` on version 6 together. Do not run `npm audit fix --force`. That command upgrades the Prisma CLI to version 7, which rejects `url` and `directUrl` in `prisma/schema.prisma` and breaks `db:setup`.

Open [http://localhost:3000](http://localhost:3000) and sign in with `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`.

Add people from **Employees**. Before employees can check in, open **Attendance** and save the office location, or turn **Everyone, anywhere** on. Check-in always stores GPS and the time. With the switch off, a punch is accepted only inside the office radius, unless that employee’s profile allows anywhere.

Useful commands:

```bash
npm run db:migrate   # apply migrations only
npm run db:seed      # create the first admin if none exists
npm run dev          # http://localhost:3000
npm run build        # prisma generate, then next build
npm start            # serve a production build locally
```

## 3. Deploy on Netlify

`netlify.toml` sets Node.js 22 and this build command:

```bash
npx prisma generate && npx prisma migrate deploy && npx next build
```

The build applies migrations, so `DATABASE_URL` and `DIRECT_URL` must exist before the first production build. The Netlify build does not create the admin account.

In the Netlify site, set these variables for **Builds**, **Functions**, and **Runtime**:

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_NAME`
- `INITIAL_ADMIN_PASSWORD`
- `SLACK_WEBHOOK_URL` (optional; posts leave requests, approvals, and the daily 8:00 IST “on leave today” note)

Use the same pooler URLs as local development, including `pgbouncer=true` on `DATABASE_URL`. Generate a new `AUTH_SECRET` for production.

Connect this folder’s Git repository in Netlify, or deploy from the project folder:

```bash
npx netlify login
npx netlify init
npx netlify deploy --build --prod
```

After the first deploy, create the admin once from your machine while `.env` points at that Supabase project:

```bash
npm run db:seed
```

That command does nothing if an active admin already exists. Sign in on the deployed site, then set the office location or turn on **Everyone, anywhere** before employees check in.
