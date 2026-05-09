# Context Log

## Current product direction

`ShuShuMaser` is evolving from a raw chart demo into a reusable astrology workspace with:

- case switching and local case storage
- `三合 / 四化 / 八字` stage modes
- a dedicated `四化` board instead of relying only on the upstream `react-iztro` rendering
- a future skill-driven right sidebar and full report area

## What is already in place

- Local SQLite case storage with export into frontend-generated data
- Screenshot-imported case list with BaZi metadata backfill
- Editable case list UI
- Database write-back path from the frontend
- Initial `四化` board with:
  - filtered stars for four-mutagen reading
  - self-mutagen outward arrow markers attached to stars
  - inward long arrows through the center area
  - fixed square geometry for the `四化` board

## Why this knowledge base exists

Recent work showed that multi-device and multi-session collaboration loses quality quickly when project decisions live only in chat context.

This folder is intended to hold:

- stable product rules
- stable method rules
- current implementation conventions
- the active execution queue

## Current constraints

- Real case data lives locally; the SQLite database file itself is not the repo truth source
- Schema, seed files, migrations, and exports are versioned
- The right sidebar is not yet the final skill-driven output system
- The current `四化` board geometry is a strong baseline, not the final polish pass
