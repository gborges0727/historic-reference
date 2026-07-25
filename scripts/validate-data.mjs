#!/usr/bin/env node
import {
  loadYearFiles,
  readJson,
  factStrings,
  factPayload,
  Report,
  DATA_DIR,
  YEARS_DIR,
} from './lib/corpus.mjs';
import { yearSchema, tierFor, allYears, resolveLead } from '../src/lib/year-schema.mjs';
import { checkAvailability } from '../src/lib/sections.mjs';
import { TECH_PHRASES } from '../src/lib/anchor.mjs';

/**
 * Data checks, in the order SPEC.md lists them.
 *
 *   --partial   skip the corpus coverage check while years are still being filled.
 *               Every other check stays strict. CI never passes this flag.
 */

const partial = process.argv.includes('--partial');
const report = new Report('validate-data');

const SECTIONS_REQUIRING_SOURCE = new Set([
  'politics',
  'world',
  'film',
  'tv',
  'music',
  'sports',
  'deaths',
]);

const PLACEHOLDER_MARKERS = [
  'example.com',
  'example.org',
  'localhost',
  'todo',
  'tbd',
  'xxx',
  '…',
];

const YEAR_TOKEN = /\b(1[0-9]{3}|20[0-9]{2})\b/g;

/** Proper names holding a number that is not a claim about time. See name_years.json. */
const nameAllowlist = readJson(DATA_DIR, 'name_years.json').names;

/** The substance floor. Every pilot year clears these comfortably. */
const MIN_FACTS = 14;
const MIN_SECTIONS = 6;
const ALWAYS_REQUIRED_SECTIONS = ['politics', 'world', 'film'];

function sourceProblem(source) {
  if (source === '') return 'missing';
  if (!source.startsWith('https://')) return 'must be an https:// URL';
  const rest = source.slice('https://'.length);
  if (!rest.includes('.') || rest.length < 4) return 'not a usable URL';
  const lower = source.toLowerCase();
  const marker = PLACEHOLDER_MARKERS.find((m) => lower.includes(m));
  if (marker) return `looks like a placeholder (${marker})`;
  return null;
}

/** Years appearing in the "of YYYY" shape, which is how revue films were titled. */
function titleYears(text) {
  const found = new Set();
  for (const m of text.matchAll(/\bof (\d{4})\b/g)) found.add(Number(m[1]));
  return found;
}

function requiresSource(fact) {
  if (SECTIONS_REQUIRING_SOURCE.has(fact.section)) return true;
  if (/\d/.test(factPayload(fact))) return true;
  return false;
}

const files = loadYearFiles();

for (const file of files) {
  const scope = file.name;

  // 1. Schema, and filename matches year.
  if (file.error) {
    report.error(scope, 'schema', file.error);
    continue;
  }
  const parsed = yearSchema.safeParse(file.data);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const path = issue.path.length ? issue.path.join('.') : '(root)';
      report.error(scope, 'schema', `${path}: ${issue.message}`);
    }
    continue;
  }
  const year = parsed.data;
  if (file.filenameYear === null) {
    report.error(scope, 'schema', 'filename must be <year>.json');
  } else if (file.filenameYear !== year.year) {
    report.error(scope, 'schema', `filename says ${file.filenameYear}, year field says ${year.year}`);
  }

  // 2. Source coverage.
  for (const [id, fact] of Object.entries(year.facts)) {
    if (!requiresSource(fact)) {
      if (fact.source !== '') {
        const problem = sourceProblem(fact.source);
        if (problem) report.error(scope, 'source', `${id}: ${problem}`);
      }
      continue;
    }
    const problem = sourceProblem(fact.source);
    if (problem) report.error(scope, 'source', `${id}: source ${problem}`);
  }

  // 3. Lead integrity.
  const seenPointers = new Set();
  const seenIds = new Set();
  for (const pointer of year.lead) {
    if (seenPointers.has(pointer)) {
      report.error(scope, 'lead', `${pointer} appears twice`);
    }
    seenPointers.add(pointer);
    const resolved = resolveLead(pointer, year.facts);
    if (!resolved) {
      report.error(scope, 'lead', `${pointer} does not resolve to a fact value`);
      continue;
    }
    if (seenIds.has(resolved.id)) {
      report.warn(scope, 'lead', `${resolved.id} is pointed at more than once`);
    }
    seenIds.add(resolved.id);
  }

  // 4. Anachronism. Sources are exempt: an article about 1931 can be dated 2019.
  const scanned = [
    ...year.texture.map((text, i) => ({ field: `texture[${i}]`, text })),
    { field: 'headline', text: year.headline },
    ...Object.entries(year.facts).flatMap(([id, fact]) => factStrings(id, fact)),
  ];
  for (const { field, text } of scanned) {
    const titled = titleYears(text);
    for (const match of text.matchAll(YEAR_TOKEN)) {
      const found = Number(match[1]);
      if (found <= year.year) continue;
      // Revue films were conventionally titled for the coming year, so a 1935 page
      // legitimately lists "Broadway Melody of 1936". The year inside a title is a
      // proper noun rather than a claim about when something happened. Narrow on
      // purpose: only the film section, only the very next year, and only in the
      // "of YYYY" shape the convention actually uses.
      const isRevueTitle =
        field.startsWith('film.') && found === year.year + 1 && titled.has(found);
      // Annual sports games are titled for the season ahead, so Madden NFL 2002 and NBA
      // Live 2002 both ship in 2001. This is the same convention as the revue films and
      // recurs every year from the late 1990s on, which is why it gets a rule instead of
      // an allowlist entry per franchise per year. Kept as tight as the revue one: only
      // the games section, only the very next year, so a games fact claiming something
      // happened two years out still fails.
      const isSeasonTitle = field.startsWith('tech.games') && found === year.year + 1;
      // Other proper names carry a four-digit number that no shape rule can spot, and
      // it is not always a title and not always in the film section: "2001: A Space
      // Odyssey" in a 1968 rentals list, the arcade cabinet "Robotron: 2084" in 1982,
      // the railcar "Budd SPV-2000" in 1978. A model number is not a claim about time
      // either. Those are named one at a time in name_years.json and the exemption
      // fires only when the full name string is present in the text, which is what
      // keeps a bare stray year from passing. No section restriction: the safety comes
      // from matching the whole name, not from which section the fact sits in.
      const isKnownName = nameAllowlist.some(
        (name) => name.includes(String(found)) && text.includes(name),
      );
      if (isRevueTitle || isSeasonTitle || isKnownName) continue;
      report.error(
        scope,
        'anachronism',
        `${field} contains ${found}, later than ${year.year}`,
      );
    }
  }

  // Dated facts belong to the page year.
  for (const [id, fact] of Object.entries(year.facts)) {
    if (fact.date && !fact.date.startsWith(`${year.year}-`)) {
      report.error(scope, 'date', `${id}: date ${fact.date} is outside ${year.year}`);
    }
  }

  // 5. Section availability.
  for (const [id, fact] of Object.entries(year.facts)) {
    const verdict = checkAvailability(id, fact.section, year.year);
    if (!verdict.ok) {
      const { from, until } = verdict.window;
      const range = until === null ? `from ${from}` : `${from} to ${until}`;
      report.error(scope, 'availability', `${id}: ${verdict.key} runs ${range}`);
    } else if (verdict.unregistered) {
      report.warn(
        scope,
        'availability',
        `${id} has no availability window. Add one to sections.mjs.`,
      );
    }
  }

  // Substance. A year can satisfy every rule above and still be a thin page: two
  // paragraphs, four lead pointers, six facts. This is the floor that makes thin a
  // build failure rather than something a reader notices on page forty.
  {
    const sectionsUsed = new Set(Object.values(year.facts).map((f) => f.section));
    const factCount = Object.keys(year.facts).length;
    if (factCount < MIN_FACTS) {
      report.error(scope, 'substance', `${factCount} facts, needs at least ${MIN_FACTS}`);
    }
    if (sectionsUsed.size < MIN_SECTIONS) {
      report.error(
        scope,
        'substance',
        `facts in ${sectionsUsed.size} sections, needs at least ${MIN_SECTIONS}`,
      );
    }
    for (const required of ALWAYS_REQUIRED_SECTIONS) {
      if (!sectionsUsed.has(required)) {
        report.error(scope, 'substance', `no ${required} fact, and that section is open in every year`);
      }
    }
  }

  // 6. Tier.
  const expectedTier = tierFor(year.year);
  if (year.tier !== expectedTier) {
    report.error(scope, 'tier', `stored ${year.tier}, computed ${expectedTier}`);
  }

  // Box office basis travels with the box office fact.
  if (year.facts['film.gross'] && !year.figures_basis) {
    report.error(scope, 'basis', 'film.gross present but figures_basis missing');
  }
  if (year.figures_basis === 'unavailable' && year.facts['film.gross']) {
    const values = factPayload(year.facts['film.gross']);
    if (values.includes('$')) {
      report.error(scope, 'basis', 'figures_basis is unavailable but film.gross carries dollar amounts');
    }
  }

  // So does the territory, which figures_basis cannot express. Some film pages rank by
  // North American gross and others by worldwide gross, and the two differ by more than
  // the rentals-to-gross gap does. 1988 and 1989 are worldwide while 1987 either side of
  // them is North American, so a reader comparing the biggest film of two adjacent years
  // is comparing different measurements unless the fact says which. Every written year
  // already names its territory except the 1987 pilot, which is why this is a check and
  // not a wish: it costs one fix now and stops the next thirty-four years from omitting it.
  const grossFact = year.facts['film.gross'];
  if (grossFact && year.figures_basis !== 'unavailable') {
    const stated = `${grossFact.label} ${grossFact.detail ?? ''}`.toLowerCase();
    const namesTerritory = /worldwide|domestic|north america|united states and canada/.test(stated);
    if (!namesTerritory) {
      report.error(
        scope,
        'basis',
        'film.gross names no territory: say North America, domestic, or worldwide in the label or detail',
      );
    }
  }
}

// The technology-age line runs on all 106 pages off one file, so every entry in it
// needs a source and a way to be phrased. A key with neither renders nothing and
// nobody notices.
{
  const firsts = readJson(DATA_DIR, 'tech_firsts.json');
  const sources = readJson(DATA_DIR, 'tech_firsts.sources.json').entries;
  for (const [key, year] of Object.entries(firsts)) {
    if (!sources[key]) {
      report.error('tech_firsts', 'sources', `${key} has no entry in tech_firsts.sources.json`);
    } else {
      if (sources[key].year !== year) {
        report.error(
          'tech_firsts',
          'sources',
          `${key} is ${year} in tech_firsts.json and ${sources[key].year} in the sources file`,
        );
      }
      if (!String(sources[key].source ?? '').startsWith('https://')) {
        report.error('tech_firsts', 'sources', `${key} has no source URL`);
      }
    }
    if (!TECH_PHRASES[key]) {
      report.error('tech_firsts', 'phrasing', `${key} has no phrase in anchor.mjs, so it never renders`);
    }
  }
  for (const key of Object.keys(TECH_PHRASES)) {
    if (!(key in firsts)) {
      report.error('tech_firsts', 'phrasing', `anchor.mjs phrases ${key}, which has no year`);
    }
  }
}

// 7. Coverage.
if (partial) {
  const have = files.filter((f) => f.data !== null).length;
  process.stdout.write(`validate-data: partial run, ${have} of ${allYears().length} years present\n`);
} else {
  const present = new Map(files.map((f) => [f.filenameYear, f]));
  const missing = allYears().filter((y) => !present.has(y));
  if (missing.length > 0) {
    const shown = missing.length > 12 ? `${missing.slice(0, 12).join(', ')} and ${missing.length - 12} more` : missing.join(', ');
    report.error('corpus', 'coverage', `missing year files: ${shown}`);
  }
  for (const file of files) {
    if (file.bytes === 0) report.error(file.name, 'coverage', 'file is empty');
  }
  const strays = files.filter((f) => f.filenameYear === null);
  for (const stray of strays) {
    report.error(stray.name, 'coverage', `unexpected file in ${YEARS_DIR}`);
  }
}

report.finish();
