# ShuShuMaser

`ShuShuMaser` is a local astrology workspace built around:

- Zi Wei Dou Shu charting and analysis
- BaZi / Four Pillars support
- case management with a local SQLite-backed workflow
- a browser-based product surface for `三合 / 四化 / 八字`

## Project shape

- `src/`
  Frontend application.
- `db/`
  Schema and seed material for the local case database.
- `scripts/`
  Data migration and export scripts.
- `docs/`
  Living knowledge base for product context, rules, and next steps.

## Knowledge base

Start here:

- [`docs/README.md`](/Users/travis.zhao/SSMaster/docs/README.md)
- [`docs/context-log.md`](/Users/travis.zhao/SSMaster/docs/context-log.md)
- [`docs/product-decisions.md`](/Users/travis.zhao/SSMaster/docs/product-decisions.md)
- [`docs/sihua-display-rules.md`](/Users/travis.zhao/SSMaster/docs/sihua-display-rules.md)

## Local workflow

Install dependencies:

```bash
npm install
```

Start dev server:

```bash
npm run dev
```

Sync case data into the frontend:

```bash
npm run sync:cases
```

Build:

```bash
npm run build
```
