PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('男', '女', '未知')),
  solar_date TEXT NOT NULL,
  source_section TEXT,
  source_order INTEGER NOT NULL,
  imported_from TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cases_import_order
ON cases(imported_from, source_order);

CREATE INDEX IF NOT EXISTS idx_cases_name
ON cases(name);
