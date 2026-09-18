import { canonicalize, type Json } from './canonical';
import { sha256Hex } from './sha256';
import { HASH_FIELD, type AatRecord } from './schema';

export type LinkStatus = 'ok' | 'hash_mismatch' | 'link_broken' | 'unhashed';

export interface LinkResult {
  index: number;
  status: LinkStatus;
  declared: string | null;
  computed: string | null;
  detail: string;
}

export interface ChainReport {
  links: LinkResult[];
  /** True when every record hashes to its declared value and links to its predecessor. */
  intact: boolean;
  /** Index of the first record that failed, or null. */
  firstBreak: number | null;
  /** record_hash of the final record — the only value an external anchor would pin. */
  head: string | null;
  signedRecords: number;
}

/** The genesis record's prev_hash: 64 zeros, or empty/absent. */
const GENESIS = '0'.repeat(64);

function isGenesisLink(prev: unknown): boolean {
  return prev === GENESIS || prev === '' || prev === null || prev === undefined;
}

/** Hash a record over its canonical form, with record_hash removed. */
export function computeRecordHash(record: AatRecord): string {
  const { [HASH_FIELD]: _omit, ...rest } = record;
  void _omit;
  return sha256Hex(canonicalize(rest as Json));
}

export function verifyChain(records: AatRecord[]): ChainReport {
  const links: LinkResult[] = [];
  let firstBreak: number | null = null;
  let signedRecords = 0;

  /**
   * Each link is checked against the predecessor's RECOMPUTED hash, not the
   * value the predecessor declares about itself. The difference is not
   * cosmetic. An edited record keeps its stale declared record_hash, so a
   * verifier that trusts that value finds one bad record and waves the rest
   * of the log through. Chaining on the recomputed value is what makes a
   * single edit orphan everything after it.
   */
  let prevComputed: string | null = null;

  records.forEach((rec, index) => {
    if (rec['signature'] !== undefined && rec['signature'] !== '') signedRecords++;

    const declared = typeof rec[HASH_FIELD] === 'string' ? (rec[HASH_FIELD] as string) : null;

    if (declared === null) {
      links.push({
        index,
        status: 'unhashed',
        declared: null,
        computed: null,
        detail: 'record carries no record_hash, so nothing links to or from it',
      });
      if (firstBreak === null) firstBreak = index;
      prevComputed = null;
      return;
    }

    const computed = computeRecordHash(rec);

    if (computed !== declared) {
      links.push({
        index,
        status: 'hash_mismatch',
        declared,
        computed,
        detail: 'record_hash does not match the record it is attached to',
      });
      if (firstBreak === null) firstBreak = index;
      prevComputed = computed;
      return;
    }

    const prev = rec['prev_hash'];
    if (index === 0) {
      if (!isGenesisLink(prev)) {
        links.push({
          index,
          status: 'link_broken',
          declared,
          computed,
          detail: 'first record points at a predecessor that is not in this log',
        });
        if (firstBreak === null) firstBreak = index;
        prevComputed = computed;
        return;
      }
    } else if (prev !== prevComputed) {
      links.push({
        index,
        status: 'link_broken',
        declared,
        computed,
        detail:
          prevComputed === null
            ? 'the record before it has no usable hash to link back to'
            : 'prev_hash does not match what the record before it actually hashes to',
      });
      if (firstBreak === null) firstBreak = index;
      prevComputed = computed;
      return;
    }

    prevComputed = computed;
    links.push({ index, status: 'ok', declared, computed, detail: 'hashes and links cleanly' });
  });

  const last = records.length ? records[records.length - 1][HASH_FIELD] : null;

  return {
    links,
    intact: firstBreak === null && records.length > 0,
    firstBreak,
    head: typeof last === 'string' ? last : null,
    signedRecords,
  };
}

/** Rebuild a chain end to end. Used to re-seal a log after an edit. */
export function reseal(records: AatRecord[]): AatRecord[] {
  let prev = GENESIS;
  return records.map((rec) => {
    const { [HASH_FIELD]: _drop, ...rest } = rec;
    void _drop;
    const body = { ...rest, prev_hash: prev };
    const hash = computeRecordHash(body);
    prev = hash;
    return { ...body, [HASH_FIELD]: hash };
  });
}
