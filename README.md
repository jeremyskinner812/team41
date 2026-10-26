# EZ Trader Platform

Simulated stock-trading web app for IFT 401 (Team 41). Customers trade stocks against a simulated
market; administrators create stocks and control market hours. All prices come from a built-in
random price generator: no real market data, no real money.

**Stack:** MySQL 8 · Sequelize 6 · Node.js + Express · React (Vite). Everything runs locally.

> Status: Phases 2–6 are complete: environment, database, REST API, price generator and the
> React front end.

---

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | 20 or newer (developed on 24) | `node -v` |
| npm | 10 or newer | `npm -v` |
| MySQL Server | 8.x, running on `localhost:3306` | `mysql --version` |

Docker is **not** required. If you'd rather not install MySQL, see
[Optional: MySQL in Docker](#optional-mysql-in-docker).

---

## Setup (first time)

Run all commands from the repository root.

### 1. Install dependencies

```bash
npm install
```

This installs the root, `server/` and `client/` workspaces in one go.

### 2. Create your `.env`

```bash
# macOS / Linux / Git Bash
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

The defaults work as-is with step 3. If you change `DB_USER` / `DB_PASSWORD`, change them in
`server/scripts/create-db.sql` too.

### 3. Create the database and app user (one time, as MySQL root)

```bash
mysql -u root -p < server/scripts/create-db.sql
```

On Windows, if `mysql` isn't on your PATH:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "source server/scripts/create-db.sql"
```

This creates the `ez_trader` and `ez_trader_test` databases and a `ez_trader` user that can only
access them.

### 4. Build and seed the schema

```bash
npm run db:migrate
npm run db:seed
```

### 5. Run the app

```bash
npm run dev
```

| Service | URL |
|---|---|
| API | http://localhost:4000 (health check: http://localhost:4000/api/health) |
| Client | http://localhost:5173 (open this to use the app) |

A healthy API answers:

```json
{ "status": "ok", "database": "up", "time": "..." }
```

---

## Demo accounts

Created by `npm run db:seed`. **Development passwords only.**

| Username | Password | Role | Cash | Holdings |
|---|---|---|---|---|
| `admin` | `Admin123!` | admin | — | — |
| `jdoe` | `Password123!` | customer | $17,464.95 | 15 AAPL, 10 MSFT |
| `msmith` | `Password123!` | customer | $5,811.40 | 30 NVDA, 50 KO |
| `alee` | `Password123!` | customer | $10,000.00 | none |

The seed also loads:
- 10 stocks.
- About two weeks of 30-minute price history (1,400 points).
- 5 filled orders with their transactions.
- A market schedule covering 30 days back to 365 days ahead: open weekdays 09:30–16:00
  America/Chicago, closed on Thanksgiving.

### Pages

| Who | Page | URL |
|---|---|---|
| Everyone | Log in / Create account | `/login`, `/register` |
| Customer | Dashboard: portfolio, holdings, available stocks | `/dashboard` |
| Customer | Buy / sell | `/trade`, `/trade/:ticker` |
| Customer | Orders & transaction history | `/history` |
| Customer | Cash management | `/cash` |
| Admin | Stock management | `/admin/stocks` |
| Admin | Market settings: hours, trading days, holidays | `/admin/market` |

The market open/closed badge is in the header of every page after login. The dashboard and
trade pages refresh prices every 15 seconds.

---

## API notes

The endpoint list is in [CLAUDE.md §7](CLAUDE.md). A few conventions:

- **Auth** is a JWT in the httpOnly `ez_token` cookie, set by `register` and `login`.
  - With curl, use `-c cookies.txt` on login and `-b cookies.txt` afterwards.
  - Only customers can trade or use cash; only admins can use `/api/admin/*`.
- **Money** is always a string with two decimals, e.g. `"1215.40"`, in requests and responses.
  Request amounts may be a number or a string, with at most 2 decimal places.
- **Errors** look like `{ "error": { "code": "...", "message": "..." } }`.
  Validation errors also carry a per-field `details` array.

| Status | Codes | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR`, `INVALID_HOURS`, `INVALID_HOLIDAY` | Malformed or invalid input |
| 401 | `UNAUTHENTICATED` | Not logged in, or the session expired |
| 403 | `FORBIDDEN` | Wrong role, e.g. an admin placing an order |
| 404 | `NOT_FOUND` | Unknown ticker, or an order that isn't yours |
| 409 | `MARKET_CLOSED`, `ORDER_NOT_CANCELLABLE`, `DUPLICATE_TICKER`, `USERNAME_TAKEN`, `EMAIL_TAKEN` | Conflicts with current state |
| 422 | `INSUFFICIENT_FUNDS`, `INSUFFICIENT_SHARES` | Not enough cash or shares |

### Insomnia collection and demo queries

[docs/insomnia/ez-trader-demo.json](docs/insomnia/ez-trader-demo.json) is an Insomnia collection with 43 requests in 7 folders, in demo order.

- **Import:** Insomnia → Import → choose the file. The environment (`base_url`) is included.
- **Auth:** Insomnia stores and resends the login cookie automatically.
- **Expected results:** each request's description lists the HTTP status it should return.

[docs/insomnia/demo-queries.sql](docs/insomnia/demo-queries.sql) has matching queries to open in MySQL Workbench.

### Demoing outside market hours

Orders are rejected while the market is closed: by default weekdays 09:30–16:00 America/Chicago.
To demo at any time:

1. Log in as `admin` and open **Market Settings**.
2. Set the hours to 00:00–23:59 and tick all seven days.
3. Save both forms.

Or do the same with curl:

```bash
curl -c admin.txt -H "Content-Type: application/json" -X POST localhost:4000/api/auth/login \
  -d '{"username":"admin","password":"Admin123!"}'
curl -b admin.txt -H "Content-Type: application/json" -X PUT localhost:4000/api/admin/market/hours \
  -d '{"openingTime":"00:00","closingTime":"23:59"}'
curl -b admin.txt -H "Content-Type: application/json" -X PUT localhost:4000/api/admin/market/schedule \
  -d '{"tradingDays":["SUN","MON","TUE","WED","THU","FRI","SAT"],"holidays":[]}'
```

To restore the normal schedule, set the hours back to 09:30–16:00 and the trading days to Mon–Fri,
or run `npm run db:reset`.

### Price generator

While the market is open, prices tick on `PRICE_TICK_CRON` (default: every minute). Each tick
moves every stock by at most ±`PRICE_MAX_DRIFT_PCT` (default 2%) and appends a `Price_History`
row. While the market is closed, nothing changes. To make movement easier to see in a demo,
set a faster six-field schedule in `.env`, e.g. `PRICE_TICK_CRON=*/10 * * * * *` (every 10 s).

Run only one API server per database. A second copy refuses to start on the same port, and
ticks closer together than 2 s are discarded as duplicates.

---

## Scripts

| Command | What it does |
|---|---|
| `npm install` | Install all workspaces |
| `npm run db:up` | Start the optional Docker MySQL container |
| `npm run db:migrate` | Apply all migrations |
| `npm run db:seed` | Load demo data (safe to re-run: already-applied seeders are skipped) |
| `npm run db:reset` | Undo all seeds and migrations, then migrate and seed again. **Dev only: wipes data.** |
| `npm run dev` | API (:4000) and client (:5173) together |
| `npm run dev:server` | API only, auto-restarts on change |
| `npm run dev:client` | Vite client only |
| `npm test` | Jest + supertest API tests |
| `npm run lint` | ESLint for server and client |

---

## Project layout

```
.
├── .env.example            # copy to .env
├── docker-compose.yml      # optional MySQL container
├── server/
│   ├── .sequelizerc        # points sequelize-cli at src/
│   ├── scripts/create-db.sql
│   └── src/
│       ├── index.js        # boot: DB connection check, then listen
│       ├── app.js          # express app (CORS, JSON, cookies, routes, error handler)
│       ├── config/         # env.js (app), database.cjs (shared with sequelize-cli)
│       ├── models/         # Sequelize models + associations (index.js)
│       ├── migrations/     # *.cjs, one per table
│       ├── seeders/        # *.cjs; seeders/lib/demoData.cjs builds the shared demo data
│       ├── routes/ controllers/ services/ middleware/ jobs/ utils/
│       └── ...
└── client/                 # React + Vite
```

Migrations and seeders are `.cjs` because `sequelize-cli` loads them with `require()`. All
application code is ES modules.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `[db] connection failed: Access denied for user 'ez_trader'` | Step 3 hasn't been run, or `.env` credentials don't match `create-db.sql`. |
| `[db] connection failed: connect ECONNREFUSED` | MySQL isn't running. On Windows, start the `MySQL80` service (`services.msc`). |
| `Port 5173 is already in use` | Another Vite app is running. The client must use 5173 because `CLIENT_ORIGIN` points there. |
| `db:seed` errors with `Duplicate entry` | The database has data from a different seed. Run `npm run db:reset`. |

---

## Optional: MySQL in Docker

If you have Docker and **no** native MySQL on port 3306:

```bash
npm run db:up        # starts mysql:8.0 with credentials matching .env.example
npm run db:migrate
npm run db:seed
```

Skip step 3; the container creates the database and user itself.
