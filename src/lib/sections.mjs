import { SECTIONS, tierFor } from './year-schema.mjs';

/**
 * Section availability and page grouping.
 *
 * Two jobs. The validator asks whether a fact is allowed to exist in a given year.
 * The renderer asks which sections have facts and in what order to print them.
 * A section with no facts renders nothing at all, so the renderer never needs the
 * availability table: an unavailable section is simply a section with no facts.
 */

/**
 * Availability windows. `until` is inclusive, null means still running in 2025.
 * Keys are either a section name, which governs every fact in that section, or a
 * `section.family` name, which governs the fact ids mapped to it below.
 *
 * The spec table is the source of these years. Additions past that table are
 * marked, and each one needs the same kind of justification the originals have.
 */
export const WINDOWS = {
  politics: { from: 1920, until: null },
  world: { from: 1920, until: null },
  film: {
    from: 1920,
    until: null,
    why: 'section default for one-off release facts, the same arrangement as music and tech. The gated film keys below bind by exact id first.',
  },
  'film.gross': { from: 1920, until: null },
  'film.awards': { from: 1929, until: null, why: 'first Academy Awards ceremony' },
  'film.world_cinema': { from: 1920, until: null },
  'film.ticket_price': { from: 1948, until: null, why: 'earliest reliable US average' },
  'film.how_people_watched': { from: 1920, until: null },
  radio: { from: 1920, until: 1959 },
  tv: { from: 1950, until: null, why: 'Nielsen season rankings start 1950-51' },
  music: {
    from: 1920,
    until: null,
    why: 'section default for one-off release facts, the same arrangement as tech. Anything citing a chart position must use a gated id below so the 1940 and 1958 gates fire.',
  },
  'music.charts': { from: 1940, until: null, why: 'Billboard best-seller chart begins' },
  'music.recordings': {
    from: 1920,
    until: null,
    why: 'added: what sold, with no chart claimed. Before 1940 there was no Billboard chart to cite, and retrospective compilations rank records after the fact, so those years can say what people bought but not where it charted.',
  },
  'music.hot100': { from: 1958, until: null },
  'music.format': { from: 1920, until: null, why: 'added: how people listened, prose, always present' },
  tech: {
    from: 1920,
    until: null,
    why: 'section default for one-off product facts. Anything about an online service belongs under a gated family below instead, or the gate will not fire.',
  },
  'tech.devices': { from: 1920, until: null },
  'tech.games': {
    from: 1972,
    until: null,
    why: 'added: the Magnavox Odyssey, the first commercial home console, shipped in September 1972, the same year as the Pong arcade cabinet. https://en.wikipedia.org/wiki/Magnavox_Odyssey',
  },
  'tech.internet': { from: 1993, until: null },
  'tech.web_sites': { from: 1996, until: null },
  'tech.social': { from: 2003, until: null },
  prices: { from: 1920, until: null },
  culture: {
    from: 1920,
    until: null,
    why: 'section default for one-off cultural facts, the same arrangement as film, music and tech. culture.memes stays gated at 1996.',
  },
  'culture.slang': { from: 1920, until: null },
  'culture.memes': { from: 1996, until: null },
  'culture.mood': { from: 1920, until: null, why: 'added: qualitative, no numbers, always present' },
  sports: { from: 1920, until: null },
  deaths: { from: 1920, until: null },
};

/**
 * Fact ids that belong to a gated family under a different name. Without this map
 * `film.best_picture` would look unregistered and the 1929 gate would never fire.
 */
export const FAMILIES = {
  'film.best_picture': 'film.awards',
  'film.acting_awards': 'film.awards',
  'film.other_awards': 'film.awards',
  'music.hot100_year_end': 'music.hot100',
  'music.hot100_launch': 'music.hot100',
  'music.best_selling_album': 'music.charts',
  'music.chart_toppers': 'music.charts',
  'music.listening_format': 'music.format',
  'tech.internet_users': 'tech.internet',
  'tech.web_use': 'tech.internet',
  'tech.netflix_qwikster': 'tech.internet',
  'tech.facebook': 'tech.social',
  'tech.twitter': 'tech.social',
  'tech.google_plus': 'tech.social',
  'tech.instagram': 'tech.social',
};

export const SECTION_TITLES = {
  politics: 'Politics',
  world: 'World',
  film: 'Film',
  tv: 'Television',
  radio: 'Radio',
  music: 'Music',
  tech: 'Technology',
  prices: 'Prices and wages',
  culture: 'Culture',
  sports: 'Sports',
  deaths: 'Deaths',
};

/** Print order for the grouped section list. */
export const SECTION_ORDER = SECTIONS;

/**
 * Which window governs a fact. Returns the window key, or null when nothing in
 * the table claims it. Null is a reportable condition, not an error: it means a
 * new fact family exists and nobody has decided when it starts.
 */
export function windowKeyFor(id, section) {
  if (WINDOWS[id]) return id;
  if (FAMILIES[id]) return FAMILIES[id];
  if (WINDOWS[section]) return section;
  return null;
}

/** True when `year` falls inside the window, given a key from windowKeyFor. */
export function windowCovers(key, year) {
  const w = WINDOWS[key];
  if (!w) return true;
  if (year < w.from) return false;
  if (w.until !== null && year > w.until) return false;
  return true;
}

/**
 * Availability verdict for one fact.
 * `{ ok: true }`, `{ ok: false, key, window }`, or `{ ok: true, unregistered: true }`.
 */
export function checkAvailability(id, section, year) {
  const key = windowKeyFor(id, section);
  if (key === null) return { ok: true, unregistered: true };
  if (windowCovers(key, year)) return { ok: true, key };
  return { ok: false, key, window: WINDOWS[key] };
}

/** Window keys open in a given year. Useful for eyeballing what a year can hold. */
export function openWindows(year) {
  return Object.keys(WINDOWS).filter((key) => windowCovers(key, year));
}

/**
 * Facts grouped for rendering: section order preserved, empty sections dropped,
 * lead facts excluded because the page prints those above in their own treatment.
 *
 * A promotion to the lead must not delete a section from the page. When a section's
 * only fact is the promoted one, it stays, because otherwise a 1938 page with one
 * radio fact and one prices fact in the lead shows neither section and reads as a
 * year with no radio and no wages. Duplicating one row is the cheaper error.
 */
export function groupFacts(facts, { exclude = [] } = {}) {
  const skip = new Set(exclude);
  return SECTION_ORDER.map((section) => {
    const inSection = Object.entries(facts).filter(([, fact]) => fact.section === section);
    const kept = inSection.filter(([id]) => !skip.has(id));
    const use = kept.length > 0 ? kept : inSection;
    return {
      section,
      title: SECTION_TITLES[section],
      facts: use.map(([id, fact]) => ({ id, ...fact })),
    };
  }).filter((group) => group.facts.length > 0);
}

export { tierFor };
