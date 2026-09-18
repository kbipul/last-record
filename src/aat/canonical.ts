/**
 * A subset of RFC 8785 (JSON Canonicalization Scheme), which is what the
 * Agent Audit Trail draft hashes over.
 *
 * Implemented here: object keys sorted by UTF-16 code unit, no insignificant
 * whitespace, JSON.stringify's own string escaping, integers serialised
 * without a decimal point.
 *
 * Not implemented: RFC 8785 section 3.2.2.3 number serialisation, which
 * requires ECMAScript's shortest round-trip form for non-integers. Audit
 * records in this format carry no floats, so the gap does not bite here —
 * but a record that did carry one could canonicalise differently under a
 * conforming implementation, and its hash would not match. Named rather than
 * hidden.
 */

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

export function canonicalize(value: Json): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('canonicalize: non-finite number');
    return Number.isInteger(value) ? String(value) : String(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';

  const keys = Object.keys(value).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ':' + canonicalize(value[k]));
  return '{' + parts.join(',') + '}';
}
