# Year Context

A static site with one page per year from 1920 to 2025. Each page tells a reader what the world was like in that year, so they can watch a film from that year with the right context in their head.

Live at [historic-reference.gbborges.workers.dev](https://historic-reference.gbborges.workers.dev).

See `SPEC.md` for the schema, validation rules, and build sequence, and `DESIGN.md` for the visual system.

## Development

```
npm install
npm run dev
```

`npm run validate` must pass before any commit. It runs `scripts/validate-data.mjs` and `scripts/validate-prose.mjs`.
