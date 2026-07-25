import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Shared loading and reporting for the two validators. No checks live here. */

export const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
export const YEARS_DIR = join(ROOT, 'src', 'data', 'years');
export const DATA_DIR = join(ROOT, 'src', 'data');

/**
 * Every year file on disk, parsed. Files that are empty or unparseable come back
 * with `data: null` and an `error` string so the caller reports them rather than
 * crashing on the first bad file.
 */
export function loadYearFiles() {
  let names;
  try {
    names = readdirSync(YEARS_DIR).filter((n) => n.endsWith('.json'));
  } catch {
    return [];
  }
  return names.sort().map((name) => {
    const path = join(YEARS_DIR, name);
    const raw = readFileSync(path, 'utf8');
    const entry = {
      name,
      path,
      raw,
      filenameYear: /^\d{4}\.json$/.test(name) ? Number(basename(name, '.json')) : null,
      bytes: statSync(path).size,
      data: null,
      error: null,
    };
    if (raw.trim() === '') {
      entry.error = 'file is empty';
      return entry;
    }
    try {
      entry.data = JSON.parse(raw);
    } catch (err) {
      entry.error = `invalid JSON: ${err.message}`;
    }
    return entry;
  });
}

export function readJson(...pathParts) {
  return JSON.parse(readFileSync(join(...pathParts), 'utf8'));
}

/** Every string a fact contributes, tagged with where it came from. */
export function factStrings(id, fact, { includeSource = false } = {}) {
  const out = [];
  const push = (field, text) => {
    if (typeof text === 'string' && text !== '') out.push({ field: `${id}.${field}`, text });
  };
  push('label', fact.label);
  if (Array.isArray(fact.value)) {
    fact.value.forEach((v, i) => push(`value[${i}]`, v));
  } else if (typeof fact.value === 'string') {
    push('value', fact.value);
  } else if (typeof fact.value === 'number') {
    push('value', String(fact.value));
  }
  push('detail', fact.detail);
  push('date', fact.date);
  if (includeSource) push('source', fact.source);
  return out;
}

/** The value and detail text a source rule looks at, joined. */
export function factPayload(fact) {
  const parts = [];
  if (Array.isArray(fact.value)) parts.push(...fact.value);
  else parts.push(String(fact.value));
  if (fact.detail) parts.push(fact.detail);
  return parts.join(' ');
}

export class Report {
  constructor(name) {
    this.name = name;
    this.entries = [];
    this.warnings = [];
  }

  error(scope, check, message) {
    this.entries.push({ scope, check, message });
  }

  warn(scope, check, message) {
    this.warnings.push({ scope, check, message });
  }

  get errorCount() {
    return this.entries.length;
  }

  /** Prints grouped output and exits non-zero when anything failed. */
  finish() {
    const byScope = new Map();
    for (const e of this.entries) {
      if (!byScope.has(e.scope)) byScope.set(e.scope, []);
      byScope.get(e.scope).push(e);
    }
    for (const [scope, list] of byScope) {
      process.stdout.write(`\n  ${scope}\n`);
      for (const e of list) process.stdout.write(`    ${e.check}: ${e.message}\n`);
    }
    if (this.warnings.length > 0) {
      process.stdout.write(`\n  warnings (not failures)\n`);
      for (const w of this.warnings) {
        process.stdout.write(`    ${w.scope} ${w.check}: ${w.message}\n`);
      }
    }
    if (this.errorCount > 0) {
      process.stdout.write(`\n${this.name}: ${this.errorCount} error(s)\n`);
      process.exit(1);
    }
    process.stdout.write(`${this.name}: pass\n`);
  }
}
