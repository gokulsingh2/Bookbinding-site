# Book Binding Site — Phase 1

**Scope of this phase:** project setup, TiDB connection, and core auth (register / login / JWT / logout / `/me`).
Forgot/reset password comes in Phase 2.

## 1. Install

```bash
cd bookbinding-site
npm install
```

## 2. Configure environment

```bash
cp .env.example .env
```

Fill in:
- `JWT_SECRET` — any long random string (e.g. `openssl rand -hex 32`)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — from your TiDB Cloud Serverless cluster's "Connect" panel
- `DB_SSL=true` — TiDB Cloud requires TLS

## 3. Create the database + table

In TiDB Cloud's SQL console (or via any MySQL client connected to it), run:

```bash
mysql -h <DB_HOST> -P 4000 -u <DB_USER> -p --ssl-mode=VERIFY_IDENTITY < sql/schema.sql
```

Or just paste the `CREATE TABLE users (...)` statement at the top of `sql/schema.sql`
into the TiDB Cloud SQL editor. Everything else in that file is commented out —
it's the schema for later phases, kept here so you always have the full picture.

## 4. Run it

```bash
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:3000
✅ Connected to database
```

If you see a connection error instead, double-check the DB_* values in `.env` first —
that's the cause 95% of the time.

## 5. Test the auth flow

Open **http://localhost:3000** → click "Test the auth flow" (or go straight to
**http://localhost:3000/test-auth.html**). This is a throwaway page (not part of the
final site) that lets you register, log in, check `/api/auth/me`, and log out —
so you can confirm everything works end-to-end without Postman.

Or via curl:

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Who am I (uses the saved cookie)
curl http://localhost:3000/api/auth/me -b cookies.txt
```

## What's included in this phase

- Express server with EJS view engine + static file serving
- MySQL/TiDB connection pool with TLS support, plus a boot-time connection check
- `users` table
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me` (protected — requires a valid JWT)
- JWT stored in an httpOnly cookie (also returned in the response body in case you
  want to use `Authorization: Bearer <token>` instead for a mobile client later)
- `middleware/isAdmin.js` scaffolded now, wired up starting Phase 4

## Next step (Phase 2)

Forgot/reset password + Nodemailer, then the `services` table and public
Home/Services/Service-detail pages.
