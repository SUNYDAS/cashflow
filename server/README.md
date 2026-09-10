# Cost Analysis API

REST API for a personal income/expense tracker. Node + Express 5 + TypeScript + MongoDB (Mongoose).

## Run it

```bash
cd server
npm install
npm run dev:mem     # in-memory MongoDB + demo data, no install needed
# or
npm run dev         # uses MONGODB_URI from .env
npm run seed        # reset a real database to the demo dataset
```

No MongoDB locally? `npm run dev:mem` spins one up in-process. For data that
persists, put a local mongod or an Atlas connection string in `.env`:

```
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/cost-analysis
```

## Endpoints

Every endpoint accepts the **same filter query**, so the table and the charts
always agree:
`from`, `to`, `type`, `category` (repeatable), `method`, `min`, `max`, `q`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness + DB status |
| `GET` | `/api/transactions` | List — adds `sort`, `order`, `limit`, `skip`; `meta` carries filtered totals |
| `POST` | `/api/transactions` | Add income or expense |
| `PATCH` | `/api/transactions/:id` | Edit |
| `DELETE` | `/api/transactions/:id` | Remove |
| `GET` | `/api/transactions/meta/categories` | Known categories + payment methods |
| `GET` | `/api/analytics/summary` | Income, expense, savings, savings rate, avg/day, change vs the previous window |
| `GET` | `/api/analytics/monthly` | Per-month income / expense / savings (`months=N`) |
| `GET` | `/api/analytics/daily` | Per-day income / expense + running balance |
| `GET` | `/api/analytics/categories` | Top expense categories with shares; the tail folds into "Other" |

Responses are `{ "data": ..., "meta"? }`; errors are `{ "error": { "message" } }`.

## Design notes

**Money is integer cents.** `1234.56` is stored as `123456` and converted back at
the edge, so sums and averages never drift.

**`summary` compares like with like.** The "vs previous" figures use a window of
the same length immediately before the selected one, computed server-side so the
client does no date maths. A percentage change against zero is `null`, not
infinity.

**A type filter cannot apply to the two-series charts.** `summary`, `monthly` and
`daily` strip `type` from the match — income vs expense are the two series of one
chart, so filtering to one type would silently empty the other.

**Search is a literal substring.** `q` is regex-escaped before it reaches Mongo.

## Layout

```
src/
  index.ts             bootstrap + graceful shutdown
  dev-seeded.ts        in-memory Mongo + demo data + API (npm run dev:mem)
  app.ts               express app, routes, one error handler
  models/              Transaction
  schemas/             zod request validation, one shared filter shape
  routes/              transactions, analytics
  lib/
    money.ts           cents conversion
    filters.ts         filter query -> Mongo match, previous-window maths
    serialize.ts       db shape -> API shape
  seed-data.ts         deterministic 8-month demo dataset
```
