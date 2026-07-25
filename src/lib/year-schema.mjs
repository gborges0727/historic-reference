import { z } from 'zod';

/**
 * The year collection schema. Imported by src/content.config.ts so Astro fails the
 * build on bad data, and by scripts/validate-data.mjs so `npm run validate` fails
 * the same way without booting Astro. One definition, two callers.
 *
 * Plain .mjs rather than .ts because the validator scripts run under bare node.
 */

export const FIRST_YEAR = 1920;
export const LAST_YEAR = 2025;

export const SECTIONS = [
  'politics',
  'world',
  'film',
  'tv',
  'radio',
  'music',
  'tech',
  'prices',
  'culture',
  'sports',
  'deaths',
];

export const TIERS = ['early', 'broadcast', 'modern'];

export const FIGURES_BASIS = ['gross', 'rentals', 'unavailable'];

/** Lowercase, dot separated, at least two segments: `pol.us_president`. */
export const FACT_ID_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*(?:\.[a-z0-9]+(?:_[a-z0-9]+)*)+$/;

/** ISO date or year-month. Empty string allowed so undated facts can carry the key. */
export const DATE_PATTERN = /^(?:\d{4}-\d{2}(?:-\d{2})?)?$/;

export const HEADLINE_MAX = 119;
export const TEXTURE_MIN_WORDS = 40;
export const TEXTURE_MAX_WORDS = 120;

/**
 * `source` is only shape-checked here. Which facts require one, and whether a URL
 * is real rather than a placeholder, is the source-coverage check in
 * scripts/validate-data.mjs. Keeping it out of the schema means a bad URL reports
 * alongside the other failures instead of short-circuiting the whole file.
 */
export const factSchema = z.strictObject({
  section: z.enum(SECTIONS),
  label: z.string().min(1),
  value: z.union([z.string().min(1), z.number(), z.array(z.string().min(1)).min(1)]),
  detail: z.string().default(''),
  date: z.string().regex(DATE_PATTERN, 'date must be YYYY-MM-DD or YYYY-MM').default(''),
  source: z.string().default(''),
});

export const yearSchema = z.strictObject({
  year: z.int().min(FIRST_YEAR).max(LAST_YEAR),
  tier: z.enum(TIERS),
  headline: z.string().min(1).max(HEADLINE_MAX),
  texture: z.array(z.string().min(1)).min(2).max(4),
  lead: z.array(z.string().min(1)).min(4).max(8),
  facts: z.record(
    z.string().regex(FACT_ID_PATTERN, 'fact ids are lowercase and dot separated'),
    factSchema,
  ),
  figures_basis: z.enum(FIGURES_BASIS).optional(),
  notes: z.string().default(''),
});

/** Tier from the year. Never stored by hand, only checked against the stored value. */
export function tierFor(year) {
  if (year <= 1949) return 'early';
  if (year <= 1992) return 'broadcast';
  return 'modern';
}

export function allYears() {
  const years = [];
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y += 1) years.push(y);
  return years;
}

export function countWords(paragraph) {
  return paragraph.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Resolve a lead pointer like `film.gross#0` into its fact and the single value
 * it points at. Returns null when the pointer does not resolve, so callers can
 * report the failure rather than render undefined.
 */
export function resolveLead(pointer, facts) {
  const [id, indexPart] = pointer.split('#');
  const fact = facts[id];
  if (!fact) return null;
  if (indexPart === undefined) {
    return { id, fact, value: fact.value, index: null };
  }
  if (!/^\d+$/.test(indexPart)) return null;
  const index = Number(indexPart);
  if (!Array.isArray(fact.value) || index >= fact.value.length) return null;
  return { id, fact, value: fact.value[index], index };
}
