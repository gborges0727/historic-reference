/** Display formatting. Nothing here reads data or decides what to show. */

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen',
];
const TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
];

/** Spelled-out numbers up to 999. The anchoring lines read as sentences, not as digits. */
export function numberToWords(n) {
  if (!Number.isFinite(n) || n < 0) return String(n);
  const whole = Math.round(n);
  if (whole < 20) return ONES[whole];
  if (whole < 100) {
    const tens = TENS[Math.floor(whole / 10)];
    const rest = whole % 10;
    return rest === 0 ? tens : `${tens}-${ONES[rest]}`;
  }
  if (whole < 1000) {
    const hundreds = `${ONES[Math.floor(whole / 100)]} hundred`;
    const rest = whole % 100;
    return rest === 0 ? hundreds : `${hundreds} ${numberToWords(rest)}`;
  }
  return String(whole);
}

/** "one year", "fifteen years". Spelled out, and singular when it has to be. */
export function spelledYears(n) {
  return `${numberToWords(n)} ${n === 1 ? 'year' : 'years'}`;
}

export function formatInt(n) {
  return n.toLocaleString('en-US');
}

/**
 * People, at the precision a reader can hold. 106,461,000 reads as 106 million,
 * because the trailing digits of a 1920 population estimate are not knowledge.
 */
export function formatPeople(n) {
  if (n === null || n === undefined) return null;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} billion`;
  if (n >= 10_000_000) return `${Math.round(n / 1_000_000)} million`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} million`;
  return formatInt(n);
}

export function formatDollars(n, { decimals = 2 } = {}) {
  if (n === null || n === undefined) return null;
  return `$${n.toFixed(decimals)}`;
}

export function formatYearsOld(n) {
  if (n === null || n === undefined) return null;
  return `${n.toFixed(1)} years`;
}

/**
 * Joins clauses into one sentence: a, b and c. No serial comma, no em dash.
 * The clauses are written to read mid-sentence, so the first letter is raised here
 * rather than in every clause template.
 */
export function joinClauses(clauses) {
  const list = clauses.filter(Boolean);
  if (list.length === 0) return '';
  const joined =
    list.length === 1 ? `${list[0]}.` : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}.`;
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}
