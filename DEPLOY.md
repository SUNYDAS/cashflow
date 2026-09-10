# Deploying Cost Analysis

The app ships as **one service**: Express serves the API *and* the built React
app, so the browser's `/api` calls are same-origin. No proxy, no CORS setup, one
URL, one bill.

```
GET /                  -> React app (dist/index.html)
GET /assets/*          -> built JS + CSS
GET /api/*             -> JSON API
GET /anything-else     -> index.html, so client-side routes work on refresh
```

Total cost on the path below: **₹0** (MongoDB Atlas free tier + Render free tier).

---

## Step 1 — Database (MongoDB Atlas)

The in-memory database used in development disappears on restart. You need a real
one.

1. Sign up at <https://www.mongodb.com/cloud/atlas/register>
2. **Create a cluster** → choose **M0 (Free)** → pick the region nearest you
   (Mumbai `ap-south-1` if you're in India)
3. **Database Access** → *Add New Database User* → username + a generated
   password. **Copy the password now**, it isn't shown again.
4. **Network Access** → *Add IP Address* → **Allow access from anywhere**
   (`0.0.0.0/0`).
   Render's free tier has no fixed outbound IP, so an allowlist of specific
   addresses will block your app. The database is still protected by the
   username and password.
5. **Connect** → *Drivers* → copy the connection string. It looks like:

   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

   **Edit it before use** — put the password in, and add the database name
   `cost-analysis` before the `?`:

   ```
   mongodb+srv://myuser:MyPassw0rd@cluster0.xxxxx.mongodb.net/cost-analysis?retryWrites=true&w=majority
   ```

   Without the database name Mongo uses `test`, and you'll wonder where your data
   went. If your password contains `@ : / ? # [ ] %`, percent-encode it
   (`@` → `%40`).

---

## Step 2 — Push to GitHub

The project isn't in version control yet. From the project folder:

```bash
git init -b main
git add .
git commit -m "Cost analysis dashboard"
```

Then create an empty repo at <https://github.com/new> (no README, no .gitignore)
and:

```bash
git remote add origin https://github.com/<you>/cost-analysis.git
git push -u origin main
```

`.gitignore` already excludes `node_modules`, `dist`, and `.env` — your Atlas
password never enters the repo.

---

## Step 3 — Deploy on Render

1. Sign up at <https://render.com> with your GitHub account
2. **New → Web Service** → pick the repo
3. Settings:

   | Field | Value |
   |---|---|
   | Language | `Node` |
   | Build Command | `npm install --include=dev && npm run build:all` |
   | Start Command | `npm start` |
   | Instance Type | `Free` |

4. **Environment variables** (Advanced → Add Environment Variable):

   | Key | Value |
   |---|---|
   | `MONGODB_URI` | the string from step 1 |
   | `NODE_ENV` | `production` |
   | `MONGOMS_DISABLE_POSTINSTALL` | `1` |

   The third one matters: `mongodb-memory-server` is a dev dependency that
   downloads a ~100 MB MongoDB binary on install. Production never uses it, and
   without this flag every deploy pays for that download.

   Don't set `PORT` — Render injects it, and the server reads it.

   **Why the build command needs `--include=dev`:** `NODE_ENV=production` makes
   npm skip devDependencies, and every build tool — vite, typescript, `@types/*` —
   is a devDependency. Without the flag the build installs almost nothing and
   fails with `Cannot find type definition file for 'vite/client'`. The runtime
   still only needs the production dependencies.

5. **Create Web Service**. First build takes ~3–5 minutes.

You get `https://<name>.onrender.com`. Open it — the dashboard loads and talks to
its own API.

---

## Step 4 — Put some data in

The app starts empty. Either add transactions through the form, or load the
8-month demo dataset by pointing the seed script at Atlas **from your machine**:

```bash
# server/.env
MONGODB_URI=mongodb+srv://...   # same string as Render

npm run seed
```

This **wipes the collection first**, so don't run it once you have real data in
there.

---

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `MONGODB_URI` | localhost | Connection string. **Required** in production — the server refuses to boot without it rather than serving broken pages. |
| `PORT` | `4000` | Injected by the host. |
| `HOST` | `0.0.0.0` | Bind address. The default is what makes a container reachable. |
| `NODE_ENV` | — | Set to `production` on the host. |
| `CORS_ORIGIN` | `http://localhost:5173` | Only used if you split frontend and backend onto separate domains. Irrelevant in the single-service setup. |

---

## Test the production build locally first

Catches most deploy failures before you push:

```bash
npm run build:all
npm start
```

This reads `server/.env`, so it uses the same Atlas database Render will.
Open <http://localhost:4000>. If it works here, it will work on Render.

---

## Things that will bite you

**Free instances sleep.** After ~15 minutes idle, Render stops the container; the
next request takes 30–60s while it wakes. Fine for personal use. $7/month removes
it, or a cron ping every 10 minutes keeps it warm.

**Atlas free tier also sleeps** after long inactivity — the first query after can
time out. Retrying works.

**Anyone with the URL can use your app.** There is no login. Everyone shares one
set of transactions. Keep the URL private, or add auth before sharing it.

**Editing the frontend needs a redeploy.** The React app is compiled into `dist/`
at build time, not served from source.

---

## Other hosts

| Host | Notes |
|---|---|
| **Railway** | Same build/start commands, no cold starts, ~$5/month after trial credit. |
| **Fly.io** | Needs a `Dockerfile`. Good free allowance, can run close to your users. |
| **Vercel / Netlify** | Frontend only. Express would have to be rewritten as serverless functions, and the single-origin trick stops working — you'd deploy the API elsewhere and set `CORS_ORIGIN`. Not worth it here. |
| **VPS** (Hetzner, DigitalOcean) | `npm run build:all`, run under `pm2` or systemd, nginx in front. Most control, most upkeep. |

All of them use the same two commands: build `npm install --include=dev && npm run
build:all`, start `npm start`.
