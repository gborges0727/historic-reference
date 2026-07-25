import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { yearSchema } from './lib/year-schema.mjs';

/**
 * Astro 7 removed the legacy content collections API, so there is no `type: 'data'`
 * and no src/content/config.ts. Data collections are a glob loader over JSON, and
 * the config lives at src/content.config.ts. SPEC.md records the deviation.
 *
 * The schema itself is shared with scripts/validate-data.mjs. Do not restate it here.
 */
const years = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/data/years' }),
  schema: yearSchema,
});

export const collections = { years };
