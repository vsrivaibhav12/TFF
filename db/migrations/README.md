# Migrations

New database changes go here as dated files, for example `2026-12-01-add-foo.sql`.
The schema as of 2026-11-11 is `db/baseline/2026-11-11-baseline.sql`; everything before it
is in `db/archive` for history and is already part of the baseline.

Apply a file with: `npm run db:apply-migration db/migrations/<file>.sql`
Each file should be safe to run once, and wrapped so a failure changes nothing.
