import {
  numberToWords,
  spelledYears,
  formatPeople,
  formatDollars,
  formatYearsOld,
  joinClauses,
} from './format.mjs';

/**
 * The anchoring block. Everything here is arithmetic on the static series, so the
 * same year always produces the same block and nothing is written by hand per year.
 * This runs on recent years too. Being wrong about how far away 2011 is is the
 * reason the site exists.
 *
 * Pure by design: callers pass the data in, which keeps it testable under bare node.
 */

/**
 * Phrasing for the technology-age line, and whether a reader in the present assumes
 * the thing exists. The assumed ones are the only entries allowed to run as a
 * countdown on a year before they arrived, because that gap is the surprising part.
 */
export const TECH_PHRASES = {
  radio_broadcasting_us: { phrase: 'radio broadcasting', plural: false, assumed: true },
  talking_pictures: { phrase: 'films with sound', plural: true, assumed: true },
  television_us_commercial: { phrase: 'commercial television', plural: false, assumed: true },
  jet_airliner_service: { phrase: 'jet airliners', plural: true, assumed: true },
  color_tv_majority_us: { phrase: 'color television in most homes', plural: false, assumed: true },
  vcr_home: { phrase: 'the home video recorder', plural: false, assumed: false },
  personal_computer: { phrase: 'the personal computer', plural: false, assumed: true },
  cd_audio: { phrase: 'the compact disc', plural: false, assumed: false },
  cell_phone_commercial: { phrase: 'cellular phone service', plural: false, assumed: true },
  world_wide_web_public: { phrase: 'the public web', plural: false, assumed: true },
  dvd: { phrase: 'the DVD', plural: false, assumed: false },
  broadband_majority_us: { phrase: 'broadband for most people online', plural: false, assumed: true },
  smartphone_modern: { phrase: 'the smartphone', plural: false, assumed: true },
  streaming_video_subscription: { phrase: 'subscription streaming', plural: false, assumed: true },
};

const COUNTDOWN_WINDOW = 15;
const TECH_CLAUSES = 4;
const ADULT_AGE = 20;
const RECALL_LIMIT = 100;

/** Latest year in a series that carries a value, with the value. */
export function latest(series) {
  const years = Object.keys(series.values)
    .map(Number)
    .sort((a, b) => b - a);
  for (const year of years) {
    const value = series.values[String(year)];
    if (value !== null && value !== undefined) return { year, value };
  }
  return null;
}

export function valueAt(series, year) {
  const value = series?.values?.[String(year)];
  return value === undefined ? null : value;
}

/** How long ago, and the same distance again measured backward from the page year. */
export function distance(year, now) {
  const years = now - year;
  return {
    years,
    words: numberToWords(years),
    spelled: spelledYears(years),
    mirrorYear: year - years,
    sameYear: years === 0,
  };
}

/**
 * Whether anyone who was an adult that year is plausibly still around to remember it.
 * A twenty-year-old is the youngest person with adult recall of a year.
 */
export function livingMemory(year, now) {
  const ageNow = now - year + ADULT_AGE;
  const withinRecall = ageNow < RECALL_LIMIT;
  return {
    ageNow,
    ageNowWords: numberToWords(ageNow),
    withinRecall,
    line: withinRecall
      ? `Someone who turned twenty in ${year} is ${numberToWords(ageNow)} now.`
      : `Someone who turned twenty in ${year} would be ${numberToWords(ageNow)} now, past the age anyone is still telling you about it firsthand.`,
  };
}

/**
 * Four figures, then against now. An item with no value for the page year is dropped
 * rather than rendered empty, and each item carries the year its "now" came from,
 * because the series do not all end in the same year.
 */
export function thenAndNow(year, series) {
  const items = [];

  const add = (key, label, format, options = {}) => {
    const source = series[key];
    if (!source) return;
    const then = valueAt(source, year);
    const nowest = latest(source);
    if (then === null || nowest === null) return;
    items.push({
      key,
      label,
      then: format(then),
      now: format(nowest.value),
      nowYear: nowest.year,
      unchanged: then === nowest.value,
      ...options,
    });
  };

  add('population_us', 'People in the US', formatPeople);
  add('population_world', 'People on earth', formatPeople);
  add('life_expectancy_us', 'US life expectancy', formatYearsOld);

  const cpi = series.cpi_us;
  const cpiThen = valueAt(cpi, year);
  const cpiNow = latest(cpi);
  if (cpiThen !== null && cpiNow !== null) {
    items.push({
      key: 'dollar',
      label: 'One dollar',
      then: formatDollars(1),
      now: formatDollars(cpiNow.value / cpiThen),
      nowYear: cpiNow.year,
      unchanged: false,
      note: `A ${year} dollar bought what ${formatDollars(cpiNow.value / cpiThen)} buys in ${cpiNow.year}.`,
    });
  }

  return items;
}

/**
 * The technology-age line. Entries already in existence are ranked newest first,
 * because the recent arrivals are what a year felt like. One countdown is allowed
 * when something a reader assumes exists is close but has not happened yet.
 */
export function technologyAge(year, techFirsts, phrases = TECH_PHRASES) {
  const known = Object.entries(techFirsts)
    .filter(([key]) => phrases[key])
    .map(([key, firstYear]) => ({ key, firstYear, ...phrases[key] }));

  const arrived = known
    .filter((t) => t.firstYear <= year)
    .sort((a, b) => b.firstYear - a.firstYear);
  const coming = known
    .filter((t) => t.firstYear > year && t.assumed && t.firstYear - year <= COUNTDOWN_WINDOW)
    .sort((a, b) => a.firstYear - b.firstYear);

  const countdowns = coming.slice(0, 1);
  const picked = [...arrived.slice(0, TECH_CLAUSES - countdowns.length), ...countdowns];

  // Two things that arrived the same year share a clause. Without this, every page
  // from 2007 on says the smartphone was N years old and then says it again about
  // subscription streaming.
  const groups = [];
  for (const item of picked) {
    const existing = groups.find((g) => g.firstYear === item.firstYear);
    if (existing) existing.items.push(item);
    else groups.push({ firstYear: item.firstYear, items: [item] });
  }

  const clauses = groups.map((group) => {
    const phrase = joinPhrases(group.items.map((i) => i.phrase));
    const plural = group.items.length > 1 || group.items[0].plural;
    const was = plural ? 'were' : 'was';
    if (group.firstYear === year) return `${phrase} arrived that year`;
    if (group.firstYear < year) return `${phrase} ${was} ${spelledYears(year - group.firstYear)} old`;
    return `${phrase} ${was} ${spelledYears(group.firstYear - year)} away`;
  });

  return { items: picked, clauses, sentence: joinClauses(clauses) };
}

function joinPhrases(phrases) {
  if (phrases.length === 1) return phrases[0];
  return `${phrases.slice(0, -1).join(', ')} and ${phrases[phrases.length - 1]}`;
}

export function buildAnchor({ year, now, series, techFirsts }) {
  return {
    year,
    now,
    distance: distance(year, now),
    livingMemory: livingMemory(year, now),
    thenAndNow: thenAndNow(year, series),
    technology: technologyAge(year, techFirsts),
  };
}
