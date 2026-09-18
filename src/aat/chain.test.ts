import { describe, it, expect } from 'vitest';
import { computeRecordHash, reseal, verifyChain } from './chain';
import { MIDDLE_EDIT, SEALED, TAIL_CUT, parseJsonl, toJsonl } from './scenarios';

describe('verifyChain', () => {
  it('accepts a sealed chain end to end', () => {
    const report = verifyChain(SEALED);
    expect(report.intact).toBe(true);
    expect(report.firstBreak).toBeNull();
    expect(report.links.every((l) => l.status === 'ok')).toBe(true);
  });

  it('catches a record rewritten after sealing, at the record itself', () => {
    const report = verifyChain(MIDDLE_EDIT);
    expect(report.intact).toBe(false);
    expect(report.firstBreak).toBe(4);
    expect(report.links[4].status).toBe('hash_mismatch');
  });

  it('orphans every record after a rewritten one', () => {
    const report = verifyChain(MIDDLE_EDIT);
    expect(report.links[5].status).toBe('link_broken');
  });

  it('THE POINT: a chain with its last three records removed still verifies', () => {
    const report = verifyChain(TAIL_CUT);
    expect(report.intact).toBe(true);
    expect(report.firstBreak).toBeNull();
    expect(TAIL_CUT.length).toBe(SEALED.length - 3);
  });

  it('gives the truncated log a different head, which nothing in the log contradicts', () => {
    const full = verifyChain(SEALED);
    const cut = verifyChain(TAIL_CUT);
    expect(cut.head).not.toBe(full.head);
    expect(cut.intact).toBe(full.intact);
  });

  it('flags a first record that points at a predecessor outside the log', () => {
    const orphanHead = SEALED.slice(1).map((r) => ({ ...r }));
    const report = verifyChain(orphanHead);
    expect(report.intact).toBe(false);
    expect(report.firstBreak).toBe(0);
    expect(report.links[0].status).toBe('link_broken');
  });

  it('reports unhashed records rather than skipping them', () => {
    const report = verifyChain([{ action_type: 'tool_call' }]);
    expect(report.links[0].status).toBe('unhashed');
    expect(report.intact).toBe(false);
  });

  it('treats an empty log as not intact', () => {
    expect(verifyChain([]).intact).toBe(false);
  });

  it('excludes record_hash from its own preimage', () => {
    const rec = { ...SEALED[3] };
    const withoutHash = { ...rec };
    delete (withoutHash as Record<string, unknown>).record_hash;
    expect(computeRecordHash(rec)).toBe(computeRecordHash(withoutHash));
  });

  it('is insensitive to key order, because the preimage is canonical', () => {
    const rec = SEALED[2];
    const shuffled = Object.fromEntries(Object.entries(rec).reverse());
    expect(computeRecordHash(shuffled)).toBe(computeRecordHash(rec));
  });
});

describe('reseal', () => {
  it('re-seals an edited log into a chain that verifies exactly as cleanly', () => {
    const forged = reseal(MIDDLE_EDIT);
    const report = verifyChain(forged);
    expect(report.intact).toBe(true);
    // Same claim, different history: the edit survives and the chain is clean.
    expect(forged[4].action_target).toBe('billing.read_invoice_v2');
  });

  it('produces a head that differs from the honest log', () => {
    expect(verifyChain(reseal(MIDDLE_EDIT)).head).not.toBe(verifyChain(SEALED).head);
  });
});

describe('parseJsonl', () => {
  it('round-trips JSON Lines', () => {
    const { records, errors } = parseJsonl(toJsonl(SEALED));
    expect(errors).toEqual([]);
    expect(records).toHaveLength(SEALED.length);
    expect(verifyChain(records).intact).toBe(true);
  });

  it('accepts a JSON array export as well', () => {
    const { records, errors } = parseJsonl(JSON.stringify(SEALED));
    expect(errors).toEqual([]);
    expect(verifyChain(records).intact).toBe(true);
  });

  it('reports the line number of a bad line and keeps the good ones', () => {
    const { records, errors } = parseJsonl('{"a":1}\nnot json\n{"b":2}');
    expect(records).toHaveLength(2);
    expect(errors[0]).toMatch(/^line 2:/);
  });

  it('ignores blank lines', () => {
    expect(parseJsonl('\n\n{"a":1}\n\n').records).toHaveLength(1);
  });

  it('returns nothing for empty input without complaining', () => {
    expect(parseJsonl('   ')).toEqual({ records: [], errors: [] });
  });
});
