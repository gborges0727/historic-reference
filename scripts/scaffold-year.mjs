#!/usr/bin/env node
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, DATA_DIR, YEARS_DIR, readJson } from './lib/corpus.mjs';
import { tierFor } from '../src/lib/year-schema.mjs';
import { openWindows, WINDOWS } from '../src/lib/sections.mjs';

/**
 * Research helper. Not part of the build, never runs in CI.
 *
 *   node scripts/scaffold-year.mjs 1931          writes .sources/1931/scaffold.json
 *   node scripts/scaffold-year.mjs 1931 --write  writes src/data/years/1931.json
 *
 * Fills in the facts that are already sourced for every year, which is everything
 * that comes out of the seven static series, and leaves the rest empty. The output
 * fails validation on purpose until the research pass fills the headline, the
 * texture, the lead, and the facts that need a year-specific source.
 *
 * --write refuses to overwrite a year file that already exists.
 */

const SERIES = [
  'cpi_us',
  'population_us',
  'population_world',
  'life_expectancy_us',
  'gas_price_us',
  'min_wage_us',
  'movie_ticket_us',
];

const series = Object.fromEntries(
  SERIES.map((name) => [name, readJson(DATA_DIR, 'series', `${name}.json`)]),
);

const valueAt = (name, year) => series[name].values[String(year)] ?? null;

/** The source entry whose range covers the year. Spliced series have several. */
function sourceFor(name, year) {
  const found = series[name].sources.find((s) => year >= s.from && year <= s.until);
  return found ?? null;
}

/** The basis label in force that year, for series that changed method mid-run. */
function basisFor(name, year) {
  const basis = series[name].basis;
  if (!basis) return null;
  return basis.find((b) => year >= b.from && year <= b.until)?.label ?? null;
}

function money(value) {
  return `$${value.toFixed(2)}`;
}

/** Facts every year gets for free, because the series behind them are already cited. */
function seriesFacts(year) {
  const facts = {};

  const gas = valueAt('gas_price_us', year);
  if (gas !== null) {
    const basis = basisFor('gas_price_us', year);
    facts['prices.gas'] = {
      section: 'prices',
      label: 'Average US gas price',
      value: `${money(gas)} per gallon`,
      detail: `${basis ? `${basis[0].toUpperCase()}${basis.slice(1)}, ` : ''}including taxes, annual average.`,
      source: sourceFor('gas_price_us', year).url,
    };
  }

  const wage = valueAt('min_wage_us', year);
  if (wage !== null) {
    facts['prices.min_wage'] = {
      section: 'prices',
      label: 'Federal minimum wage',
      value: `${money(wage)} per hour`,
      detail: 'The basic rate for covered nonfarm workers, as in effect on December 31.',
      source: sourceFor('min_wage_us', year).url,
    };
  }

  const ticket = valueAt('movie_ticket_us', year);
  if (ticket !== null) {
    const basis = basisFor('movie_ticket_us', year);
    facts['film.ticket_price'] = {
      section: 'film',
      label: 'Average US ticket price',
      value: money(ticket),
      detail: basis ? `${basis[0].toUpperCase()}${basis.slice(1)}.` : '',
      source: sourceFor('movie_ticket_us', year).url,
    };
  }

  return facts;
}

const year = Number(process.argv[2]);
const write = process.argv.includes('--write');
if (!Number.isInteger(year) || year < 1920 || year > 2025) {
  process.stdout.write('usage: node scripts/scaffold-year.mjs <year 1920-2025> [--write]\n');
  process.exit(1);
}

const facts = seriesFacts(year);
const scaffold = {
  year,
  tier: tierFor(year),
  headline: '',
  texture: [],
  lead: [],
  facts,
  notes: `Scaffolded ${new Date().toISOString().slice(0, 10)}. Series facts are filled and sourced. Everything else is the research pass.`,
};

const target = write
  ? join(YEARS_DIR, `${year}.json`)
  : join(ROOT, '.sources', String(year), 'scaffold.json');

if (write && existsSync(target)) {
  process.stdout.write(`refusing to overwrite ${target}\n`);
  process.exit(1);
}
mkdirSync(join(target, '..'), { recursive: true });
writeFileSync(target, `${JSON.stringify(scaffold, null, 2)}\n`);

process.stdout.write(`${year} (${scaffold.tier}) -> ${target.replace(`${ROOT}/`, '')}\n\n`);
process.stdout.write(`  filled from the series: ${Object.keys(facts).join(', ') || 'nothing available'}\n`);

const anchoring = ['population_us', 'population_world', 'life_expectancy_us', 'cpi_us']
  .map((name) => `${name}=${valueAt(name, year) ?? 'null'}`)
  .join('  ');
process.stdout.write(`  anchoring inputs: ${anchoring}\n\n`);

process.stdout.write('  windows open this year, so facts may exist for:\n');
for (const key of openWindows(year)) {
  const w = WINDOWS[key];
  const range = w.until === null ? `from ${w.from}` : `${w.from} to ${w.until}`;
  process.stdout.write(`    ${key.padEnd(26)} ${range}\n`);
}
const closed = Object.keys(WINDOWS).filter((key) => !openWindows(year).includes(key));
process.stdout.write(`\n  closed this year, do not write facts for: ${closed.join(', ') || 'none'}\n`);
process.stdout.write('\n  still needed: headline, 2 to 4 texture paragraphs, 4 to 8 lead pointers, sourced facts.\n');
