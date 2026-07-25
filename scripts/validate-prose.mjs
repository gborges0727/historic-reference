#!/usr/bin/env node
import { loadYearFiles, readJson, factStrings, Report, DATA_DIR } from './lib/corpus.mjs';
import { countWords, TEXTURE_MIN_WORDS, TEXTURE_MAX_WORDS } from '../src/lib/year-schema.mjs';

/**
 * Prose checks, in the order SPEC.md lists them.
 *
 * Overlap and density are the two that matter. Generated era prose converges on the
 * same handful of observations, and these catch that mechanically instead of hoping
 * a reader notices on page fifty.
 */

const report = new Report('validate-prose');
const banned = readJson(DATA_DIR, 'banned_phrases.json');

const NGRAM = 5;
const MAX_YEARS_PER_NGRAM = 2;
const DISTINCTIVE_MAX_FILES = 3;
const DISTINCTIVE_PER_PARAGRAPH = 2;

/** Prose words, lowercased, punctuation stripped, apostrophes and hyphens kept. */
function words(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'’-]/gu, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^['’-]+|['’-]+$/g, ''))
    .filter(Boolean);
}

/** Tokens as written, so capitalisation survives for the proper-noun test. */
function rawTokens(text) {
  return text
    .replace(/[^\p{L}\p{N}\s'’$%.,-]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[.,'’-]+|[.,'’-]+$/g, ''))
    .filter(Boolean);
}

function ngrams(list, n) {
  const out = [];
  for (let i = 0; i + n <= list.length; i += 1) out.push(list.slice(i, i + n).join(' '));
  return out;
}

function phraseRegex(phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const left = /^[\p{L}\p{N}]/u.test(phrase) ? '\\b' : '';
  const right = /[\p{L}\p{N}]$/u.test(phrase) ? '\\b' : '';
  return new RegExp(`${left}${escaped}${right}`, 'iu');
}

const bannedPatterns = banned.phrases.map((phrase) => ({ phrase, re: phraseRegex(phrase) }));

/**
 * Function words never count as proper nouns, however the corpus happens to fall.
 * Without this, a sentence-initial "This" or "Streaming" scores as distinctive on a
 * small corpus purely because no lowercase instance exists yet.
 *
 * The second group is the same failure from a different direction. Proper-noun-hood is
 * inferred from "capitalised here and never written lowercase anywhere in the corpus",
 * and a common noun that only ever appears inside a title beats that test. 1934 scored
 * "actor" as distinctive because its paragraph says "Best Actor" and no year file
 * happens to write the word in lowercase prose. Award names and titles of office are
 * where this collects, so they are listed rather than left to chance.
 */
const NEVER_PROPER = new Set(
  ('a an and as at but by for from he his her hers him i if in into it its no nor not of on once one or she so ' +
    'that the their them then there these they this those to two three four five six seven eight nine ten twenty ' +
    'was were what when where which while who whose with you your after before during over under up down out ' +
    'most many some few every each all both other another every anyone everyone nobody people ' +
    'actor actress picture director screenplay song score album record single series ' +
    'president senator governor representative minister chancellor king queen emperor pope general admiral ' +
    'best supporting original adapted feature short documentary').split(' '),
);

const files = loadYearFiles().filter((f) => f.data && Array.isArray(f.data.texture));

// Corpus statistics. Document frequency is counted per year file, not per mention:
// a token repeated four times in one year is still one file.
const filesWithToken = new Map();
const lowercaseSomewhere = new Set();

for (const file of files) {
  const prose = [file.data.headline ?? '', ...file.data.texture].join('\n');
  const seen = new Set(words(prose));
  for (const token of seen) {
    if (!filesWithToken.has(token)) filesWithToken.set(token, new Set());
    filesWithToken.get(token).add(file.data.year);
  }
  for (const token of rawTokens(prose)) {
    if (/^[\p{Ll}]/u.test(token)) lowercaseSomewhere.add(token.toLowerCase());
  }
}

function documentFrequency(token) {
  return filesWithToken.get(token.toLowerCase())?.size ?? 0;
}

/**
 * A distinctive token is a proper noun or a specific number that shows up in at most
 * three year files. Proper noun is inferred: capitalised here and never written
 * lowercase anywhere in the corpus, which keeps sentence-initial "Streaming" out.
 */
function distinctiveTokens(paragraph) {
  const found = new Set();
  for (const token of rawTokens(paragraph)) {
    const lower = token.toLowerCase();
    const hasDigit = /\p{N}/u.test(token);
    const capitalised = /^[\p{Lu}]/u.test(token);
    const properNoun = capitalised && !lowercaseSomewhere.has(lower) && !NEVER_PROPER.has(lower);
    if (!hasDigit && !properNoun) continue;
    if (documentFrequency(lower) > DISTINCTIVE_MAX_FILES) continue;
    found.add(lower);
  }
  return [...found];
}

// 1. Cross-year overlap.
const ngramYears = new Map();
for (const file of files) {
  const units = [file.data.headline ?? '', ...file.data.texture];
  const seen = new Set();
  for (const unit of units) {
    for (const gram of ngrams(words(unit), NGRAM)) seen.add(gram);
  }
  for (const gram of seen) {
    if (!ngramYears.has(gram)) ngramYears.set(gram, new Set());
    ngramYears.get(gram).add(file.data.year);
  }
}
const overlaps = [...ngramYears.entries()]
  .filter(([, years]) => years.size > MAX_YEARS_PER_NGRAM)
  .sort((a, b) => b[1].size - a[1].size);
for (const [gram, years] of overlaps) {
  report.error(
    'corpus',
    'overlap',
    `"${gram}" appears in ${years.size} years: ${[...years].sort().join(', ')}`,
  );
}

for (const file of files) {
  const scope = file.name;
  const { headline = '', texture, facts = {} } = file.data;

  // 2. Distinctive-token density.
  //
  // This check is corpus-relative: a token counts as distinctive while it appears in
  // at most DISTINCTIVE_MAX_FILES year files, so filling in more years makes tokens
  // commoner and can fail a paragraph that passed when it was written. 1929 broke
  // that way once the corpus reached fifty-four years. That is the check doing its
  // job, since a name in five files really is less distinctive than one in two, but
  // it means a passing run is not a permanent verdict.
  //
  // So a paragraph sitting exactly on the threshold gets a warning. It is one more
  // year mentioning the same name away from failing, and knowing that now is cheaper
  // than finding out in a batch three months from now.
  texture.forEach((paragraph, i) => {
    const distinctive = distinctiveTokens(paragraph);
    if (distinctive.length < DISTINCTIVE_PER_PARAGRAPH) {
      report.error(
        scope,
        'density',
        `texture[${i}] has ${distinctive.length} distinctive token(s), needs ${DISTINCTIVE_PER_PARAGRAPH}` +
          (distinctive.length ? ` (found ${distinctive.join(', ')})` : ''),
      );
    } else if (distinctive.length === DISTINCTIVE_PER_PARAGRAPH) {
      report.warn(
        scope,
        'density',
        `texture[${i}] is at the threshold with ${distinctive.length} (${distinctive.join(', ')}), so one more year using either token fails it`,
      );
    }
  });

  // 3, 4. Banned phrases and em dashes, across prose and fact text.
  const checkable = [
    { field: 'headline', text: headline },
    ...texture.map((text, i) => ({ field: `texture[${i}]`, text })),
    ...Object.entries(facts).flatMap(([id, fact]) => factStrings(id, fact)),
  ];
  for (const { field, text } of checkable) {
    for (const { phrase, re } of bannedPatterns) {
      if (re.test(text)) report.error(scope, 'banned', `${field} contains "${phrase}"`);
    }
    if (text.includes('—')) report.error(scope, 'em dash', `${field} contains an em dash`);
  }

  // 5. Paragraph length.
  texture.forEach((paragraph, i) => {
    const count = countWords(paragraph);
    if (count < TEXTURE_MIN_WORDS || count > TEXTURE_MAX_WORDS) {
      report.error(
        scope,
        'length',
        `texture[${i}] is ${count} words, allowed ${TEXTURE_MIN_WORDS} to ${TEXTURE_MAX_WORDS}`,
      );
    }
  });
}

report.finish();
