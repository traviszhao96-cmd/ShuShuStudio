PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('男', '女', '未知')),
  solar_date TEXT NOT NULL,
  birth_time_text TEXT,
  birth_time_index INTEGER CHECK (birth_time_index BETWEEN 0 AND 12),
  birth_time_source TEXT CHECK (birth_time_source IN ('manual', 'bazi_match', 'bazi_branch', 'placeholder')),
  manual_group TEXT CHECK (manual_group IN ('家人', '同学', '同事', '名人', '朋友')),
  bazi_year_pillar TEXT,
  bazi_month_pillar TEXT,
  bazi_day_pillar TEXT,
  bazi_hour_pillar TEXT,
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
