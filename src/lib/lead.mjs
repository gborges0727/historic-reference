/**
 * The lead table. Six or seven promoted facts printed as a two-column table beside
 * the year, where the left cell has 92px to name what the row is.
 *
 * A fact label does not fit that cell. "Highest-grossing films, US domestic rentals"
 * has to read "Film". So the row label comes from the fact id, with the section as
 * the fallback, and every rule here is a short noun rather than a rewrite of the
 * label. Nothing in this file touches a value.
 */

const SECTION_LABELS = {
  politics: 'Politics',
  world: 'World',
  film: 'Film',
  tv: 'TV',
  radio: 'Radio',
  music: 'Music',
  tech: 'Tech',
  prices: 'Prices',
  culture: 'Culture',
  sports: 'Sports',
  deaths: 'Deaths',
};

/**
 * Id rules, longest prefix first. Exact ids where a section carries two kinds of
 * lead fact often enough to be worth telling apart: film ranks films and also names
 * an award, prices carries a pump price and a wage.
 */
const ID_RULES = [
  ['pol.us_president', 'President'],
  ['film.gross', 'Film'],
  ['film.best_picture', 'Award'],
  ['film.award', 'Award'],
  ['film.ticket_price', 'Ticket'],
  ['music.record', 'Records'],
  ['music.hot100', 'Song'],
  ['music.chart', 'Song'],
  ['prices.gas', 'Gas'],
  ['prices.min_wage', 'Wage'],
  ['prices.ticket', 'Ticket'],
];

/**
 * `{ label, generic }`. Generic means the row is named after the section, so the row
 * says "Deaths" or "World" and the fact's own subject is still missing from it.
 */
export function leadLabel(id, section) {
  for (const [prefix, label] of ID_RULES) {
    if (id === prefix || id.startsWith(`${prefix}_`) || id.startsWith(`${prefix}.`)) {
      return { label, generic: false };
    }
  }
  return { label: SECTION_LABELS[section] ?? section, generic: true };
}

/**
 * Resolved lead facts collapsed into table rows. Two world events promoted together
 * make one World row rather than two rows with the same word printed twice, which is
 * how the table reads as a summary rather than as a second fact list.
 *
 * A generic row carries its fact label into the cell. Without it a Deaths row reads
 * "Died October 18, aged 84" and never says who, because on a deaths fact the name is
 * the label. The two are joined rather than made into a sentence, since the value is
 * written to start a sentence and lowercasing it would break the proper nouns.
 */
export function leadRows(items) {
  const rows = [];
  for (const item of items) {
    const { label, generic } = leadLabel(item.id, item.fact.section);
    const raw = Array.isArray(item.value) ? item.value : [item.value];
    // An indexed pointer borrows one entry out of a list, and the list's label names
    // the ranking rather than the entry, so it never prefixes.
    const prefix = generic && item.index === null ? `${item.fact.label} · ` : '';
    const values = raw.map((value) => `${prefix}${value}`);
    const last = rows[rows.length - 1];
    if (last && last.label === label) last.values.push(...values);
    else rows.push({ label, values });
  }
  return rows;
}
