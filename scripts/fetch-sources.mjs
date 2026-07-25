#!/usr/bin/env node
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/corpus.mjs';
import { tierFor } from '../src/lib/year-schema.mjs';
import { openWindows } from '../src/lib/sections.mjs';

/**
 * Research helper. Not part of the build, never runs in CI.
 *
 *   node scripts/fetch-sources.mjs 1931 1958 1987
 *
 * Pulls the year-indexed source pages as raw wikitext into .sources/<year>/ and
 * writes a manifest of what resolved. Raw rather than rendered, and read locally
 * rather than summarised, because a summariser silently drops half of a long year
 * page and you find out when a fact is missing.
 *
 * Wikipedia is research input only. Read it, then write original sentences, and
 * record the URL against the fact it supports.
 */

const UA =
  'YearContext/0.1 (static almanac build; contact via repo issues) node-fetch';
const SOURCES_DIR = join(ROOT, '.sources');
const POLITE_MS = 350;

/** Candidate page titles for a year. Misses are expected and reported, not fatal. */
function candidates(year) {
  const list = [
    { key: 'year', title: `${year}`, holds: 'events, deaths, births' },
    { key: 'year_us', title: `${year}_in_the_United_States`, holds: 'US politics and events' },
    { key: 'film', title: `${year}_in_film`, holds: 'box office, releases, festival prizes' },
    { key: 'music', title: `${year}_in_music`, holds: 'charts, albums, formats' },
    { key: 'sports', title: `${year}_in_sports`, holds: 'championships' },
    // From the 1980s on, the year article stops listing deaths and points at this
    // instead, so the deaths section comes back empty without it.
    { key: 'deaths', title: `Deaths_in_${year}`, holds: 'deaths, dated' },
  ];

  if (year >= 1929) {
    // Ceremony N honours the films of year N + 1927. The 84th honoured 2011.
    list.push({
      key: 'oscars',
      title: `${year - 1927}${ordinalSuffix(year - 1927)}_Academy_Awards`,
      holds: 'awards for this year of film',
    });
  }
  if (year >= 1920 && year <= 1959) {
    list.push({ key: 'radio', title: `${year}_in_radio`, holds: 'radio programmes and stations' });
  }
  if (year >= 1950) {
    list.push({
      key: 'tv',
      title: `${year}_in_American_television`,
      holds: 'premieres, cancellations',
    });
    list.push({
      key: 'tv_ratings',
      // The en dash is what the article titles actually use.
      title: `Top-rated_United_States_television_programs_of_${year}–${String(year + 1).slice(2)}`,
      holds: 'Nielsen season ranking',
    });
  }
  if (year >= 1958) {
    list.push({
      key: 'hot100',
      title: `Billboard_Year-End_Hot_100_singles_of_${year}`,
      holds: 'year-end singles chart',
    });
  }
  if (year >= 1972) {
    list.push({ key: 'games', title: `${year}_in_video_games`, holds: 'game releases' });
  }
  if (year >= 1993) {
    list.push({ key: 'tech', title: `${year}_in_science`, holds: 'technology and science' });
  }
  return list;
}

function ordinalSuffix(n) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  if (n % 10 === 1) return 'st';
  if (n % 10 === 2) return 'nd';
  if (n % 10 === 3) return 'rd';
  return 'th';
}

const rawUrl = (title) =>
  `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&action=raw`;
const humanUrl = (title) => `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchRaw(title) {
  const response = await fetch(rawUrl(title), { headers: { 'User-Agent': UA } });
  if (!response.ok) return { ok: false, status: response.status };
  const text = await response.text();
  // A redirect stub is a miss for our purposes: the content is elsewhere.
  const redirect = text.match(/^#REDIRECT\s*\[\[([^\]]+)\]\]/i);
  return { ok: true, status: response.status, text, redirect: redirect?.[1] ?? null };
}

const years = process.argv.slice(2).filter((a) => /^\d{4}$/.test(a)).map(Number);
if (years.length === 0) {
  process.stdout.write('usage: node scripts/fetch-sources.mjs <year> [year...]\n');
  process.exit(1);
}

for (const year of years) {
  const dir = join(SOURCES_DIR, String(year));
  mkdirSync(dir, { recursive: true });
  const manifest = { year, tier: tierFor(year), retrieved: new Date().toISOString().slice(0, 10), pages: {}, missing: [] };

  process.stdout.write(`\n${year} (${manifest.tier})\n`);
  for (const candidate of candidates(year)) {
    const file = join(dir, `${candidate.key}.wiki`);
    if (existsSync(file)) {
      const bytes = readFileSync(file, 'utf8').length;
      manifest.pages[candidate.key] = {
        title: candidate.title,
        url: humanUrl(candidate.title),
        bytes,
        holds: candidate.holds,
        cached: true,
      };
      process.stdout.write(`  cached  ${String(bytes).padStart(7)}  ${candidate.title}\n`);
      continue;
    }
    const result = await fetchRaw(candidate.title);
    await sleep(POLITE_MS);
    if (!result.ok) {
      manifest.missing.push({ key: candidate.key, title: candidate.title, status: result.status });
      process.stdout.write(`  ${String(result.status).padStart(6)}  ${' '.repeat(7)}  ${candidate.title}\n`);
      continue;
    }
    if (result.redirect) {
      manifest.missing.push({
        key: candidate.key,
        title: candidate.title,
        status: 'redirect',
        to: result.redirect,
      });
      process.stdout.write(`  redir   ${' '.repeat(7)}  ${candidate.title} -> ${result.redirect}\n`);
      continue;
    }
    writeFileSync(file, result.text);
    manifest.pages[candidate.key] = {
      title: candidate.title,
      url: humanUrl(candidate.title),
      bytes: result.text.length,
      holds: candidate.holds,
      cached: false,
    };
    process.stdout.write(`  ok      ${String(result.text.length).padStart(7)}  ${candidate.title}\n`);
  }

  writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const open = openWindows(year).join(', ');
  process.stdout.write(`  windows open: ${open}\n`);
  process.stdout.write(
    `  ${Object.keys(manifest.pages).length} pages, ${manifest.missing.length} missing, manifest in .sources/${year}/\n`,
  );
}
