# Database

| Path | What it is |
|---|---|
| `baseline/2026-11-11-baseline.sql` | The complete schema (tables, indexes, functions, views, triggers, row level security), generated from the live database. Run this to build a new database. |
| `seeds/` | Reference data to load after the baseline (compliance calendar rules). |
| `migrations/` | New changes, one dated file each. Start here for any future schema change. |
| `archive/` | The old schema, RLS and migration files, kept for history only. Do not run them. |

Build a new database: `npm run db:apply-baseline`, then `npm run db:seed-compliance-rules`.
Apply a change: `npm run db:apply-migration db/migrations/<file>.sql`.
Check access rules: `npm run db:rls-test` (read-only, always rolls back).
