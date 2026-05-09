# Data Conventions

## Local database

The project uses a local SQLite database as the working source for personal case records.

Important distinction:

- versioned in git:
  - `db/schema.sql`
  - `db/seed_screenshot_cases.sql`
  - migration scripts
  - export scripts
- not versioned as source of truth:
  - local runtime database file

## Case fields

Frontend case records currently depend on these concepts:

- `id`
- `name`
- `group`
- `birthday`
- `birthTime`
- `birthTimeText`
- `birthTimeSource`
- `gender`
- `birthdayType`
- optional `bazi` pillars

## Time source semantics

- `manual`
  Manually edited by the user.
- `bazi_match`
  Matched from screenshot BaZi plus known Gregorian birth date.
- `bazi_branch`
  Resolved only to the branch-level time bucket.
- `placeholder`
  Temporary fallback, not a final verified time.

## Case grouping

Current case group buckets:

- `家人`
- `同学`
- `同事`
- `名人`
- `朋友`

There is both:

- automatic grouping logic
- manual override support via `manual_group`

## Frontend export chain

The working chain is:

`SQLite -> migration/backfill -> export script -> generated frontend case data`

Relevant files:

- [`db/schema.sql`](/Users/travis.zhao/SSMaster/db/schema.sql)
- [`scripts/migrate-cases-db.mjs`](/Users/travis.zhao/SSMaster/scripts/migrate-cases-db.mjs)
- [`scripts/export-cases-from-sqlite.mjs`](/Users/travis.zhao/SSMaster/scripts/export-cases-from-sqlite.mjs)
- [`src/data/cases.generated.ts`](/Users/travis.zhao/SSMaster/src/data/cases.generated.ts)
