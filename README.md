# KasirKu

Offline-first point-of-sale (POS) web app for Indonesian F&B micro-businesses (UMKM): seblak stalls, boba shops, fried chicken, satay, and similar.

> Status: work in progress. Built as a micro-SaaS prototype.


## Why this exists

Small food vendors often have unstable internet and no budget for expensive POS systems. KasirKu aims to be a free-to-start cashier app that keeps working offline and syncs to the server when a connection is available.

## Features

- Multi-tenant: each business has its own isolated workspace
- Sign up / log in (email + password)
- Menu management with categories, products, and variants (e.g. spice level, toppings)
- Cashier flow: add items with variants, take cash payment, automatic change calculation
- Receipt: copy/share, plus Bluetooth / Wi-Fi printer option
- Offline-first: transactions are stored locally first, then synced to the server
- Demo mode so people can try the app without creating an account


## Tech stack

| Layer | Tech |
| --- | --- |
| Framework | Next.js (App Router), React, TypeScript |
| Database | PostgreSQL on Supabase |
| ORM | Drizzle ORM + `pg` |
| Offline / sync | Local-first store with a sync queue (`sync_events`) |

## Data model

`businesses`, `users`, `categories`, `products`, `variant_groups`, `variants`, `transactions`, `sync_events`

## Getting started

### Prerequisites

- Node.js (LTS)
- A Supabase project (free tier is fine)

### Setup

```bash
git clone https://github.com/fee74-wq/kasirku.git
cd kasirku
npm install
```

Create `.env.local` in the project root:

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@<pooler-host>:5432/postgres"
```

Use the **Session pooler** connection string from Supabase (Connect, ORMs / URI). Never commit this file.

### Create the database tables

```bash
npx drizzle-kit generate
```

Then run the generated SQL file in `drizzle/` in the Supabase SQL Editor (or use `npx drizzle-kit push`).

### Run

```bash
npm run dev
```

Open http://localhost:3000.

## Project structure

```
src/
  app/api/auth/     # register / login routes
  db/               # Drizzle client and schema
  lib/              # store, API client, helpers
  components/       # UI (cashier, menu, etc.)
drizzle/            # generated SQL migrations
```


## What I learned / challenges

- Wiring Drizzle + node-postgres to Supabase (session pooler vs direct connection, IPv4/IPv6)
- Debugging auth rate limits and session state in an offline-first client
- Keeping UI responsive when background sync fails

## Roadmap

- [ ] Fix payment modal close / "new transaction" flow
- [ ] integrate registration with a Google account
- [ ] continuing the development of paid features for pro mode
- [ ] Reliable offline sync with conflict handling
- [ ] Sales reports per day / per product

## Notes on AI assistance

This project was built with AI-assisted tooling (code generation and an AI pair-programming workflow). I set up and debugged the infrastructure (database, auth, migrations, environment) and continue to iterate on the code.

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for more information.
