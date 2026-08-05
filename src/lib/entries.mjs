/**
 * List-valued facts. A card holding five films or ten shows prints each entry on two
 * lines, the name in bold and the figures under it in grey, which is what makes a
 * ranked list scannable rather than a paragraph of commas.
 *
 * Splitting an entry means guessing where the name ends, and a wrong guess prints
 * "Marcus Welby" with "M.D." demoted to a subtitle. So only two shapes split, both
 * of them regular across the corpus, and everything else stays on one line whole.
 */

/** Lists whose source ranks them. Nothing else gets a number. */
const RANKED = ['film.gross', 'tv.top_shows', 'music.hot100_year_end'];

/**
 * "City Lights, $2,000,000, United Artists". The amount marks where the title ends.
 * The amount runs to the next comma so "$1.4 billion worldwide" stays whole, and it
 * has to end on a digit or the group swallows the comma after "$210,609,762" and
 * takes the studio with it.
 */
const MONEY = /^(.+?), (\$[\d,.]*\d[^,]*)(?:, (.+))?$/;

/** "Marcus Welby, M.D., ABC, 29.6 rating". Greedy, so the split takes the last two commas. */
const RATING = /^(.+), ([^,]+), (\d[\d.]*(?:\s+rating)?)$/;

export function isRanked(id) {
  return RANKED.some((prefix) => id === prefix || id.startsWith(`${prefix}_`));
}

/**
 * One entry as `{ rank, main, sub }`. `rank` is null on unranked lists, `sub` is null
 * when the entry did not match a shape and prints whole.
 */
export function entryParts(id, text, index) {
  const rank = isRanked(id) ? index + 1 : null;

  const money = MONEY.exec(text);
  if (money) {
    const [, main, amount, rest] = money;
    return { rank, main, sub: rest ? `${amount} · ${rest}` : amount };
  }

  if (id.startsWith('tv.top_shows')) {
    const rating = RATING.exec(text);
    if (rating) {
      const [, main, network, score] = rating;
      return { rank, main, sub: `${network} · ${score}` };
    }
  }

  return { rank, main: text, sub: null };
}

/**
 * Whether a card takes the full width of the section grid. Lists do, because a
 * five-film card in a 280px column wraps every title. So does a value long enough
 * that a narrow column would run it to six lines, which in practice is the mood
 * sentence and nothing else.
 */
const WIDE_VALUE = 120;

export function isWide(value) {
  if (Array.isArray(value)) return true;
  return typeof value === 'string' && value.length > WIDE_VALUE;
}
