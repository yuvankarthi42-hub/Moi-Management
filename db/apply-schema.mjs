/**
 * Applies db/schema.sql to the Turso database named in .env.local.
 *
 * A one-time setup tool, not a migration framework: it creates what is missing
 * and leaves what exists alone (every statement is IF NOT EXISTS-safe by way of
 * the catch below). Run it with `node db/apply-schema.mjs`.
 */
import { createClient } from '@libsql/client';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

/**
 * Splits a script into statements.
 *
 * Comments are stripped first, character by character rather than by line:
 * a trailing `-- the instant; orders a function's own list` carries both a
 * semicolon and an apostrophe, and leaving it in corrupts the quote and paren
 * tracking that the split itself relies on.
 */
function stripComments(sql) {
  let out = '';
  let quote = null;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (quote) {
      out += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i);
      i = nl === -1 ? sql.length : nl - 1;
      continue;
    }
    out += ch;
  }
  return out;
}

function statements(sql) {
  const out = [];
  let buf = '';
  let depth = 0;
  let quote = null;
  for (const ch of stripComments(sql)) {
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ';' && depth === 0) {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

const client = createClient({
  url: env.EXPO_PUBLIC_TURSO_URL,
  authToken: env.EXPO_PUBLIC_TURSO_TOKEN_DEV_ONLY,
});

const sql = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
const stmts = statements(sql);
console.log(`${stmts.length} statements\n`);

let made = 0;
let already = 0;
for (const stmt of stmts) {
  const name = stmt.match(/CREATE\s+(?:UNIQUE\s+)?(TABLE|VIEW|INDEX)\s+(\S+)/i);
  const label = name ? `${name[1].toLowerCase()} ${name[2]}` : stmt.slice(0, 40);
  try {
    await client.execute(stmt);
    console.log(`  created  ${label}`);
    made++;
  } catch (err) {
    if (/already exists/i.test(err.message)) {
      console.log(`  exists   ${label}`);
      already++;
    } else {
      console.error(`\n  FAILED   ${label}\n  ${err.message}\n`);
      process.exit(1);
    }
  }
}
console.log(`\n${made} created, ${already} already present`);
