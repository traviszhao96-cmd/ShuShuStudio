# Local Database

This folder stores lightweight local SQLite data used by the project.

## Files

- `cases.sqlite`
  The local SQLite database file.
- `schema.sql`
  Table and index definitions.
- `seed_screenshot_cases.sql`
  Seed data transcribed from the screenshot:
  `img_v3_02115_f1dcc6d0-5535-4e19-9b38-772fa8bc98hu.jpg`

## Rebuild

```bash
cd /Users/travis.zhao/SSMaster
rm -f db/cases.sqlite
sqlite3 db/cases.sqlite < db/schema.sql
sqlite3 db/cases.sqlite < db/seed_screenshot_cases.sql
```
