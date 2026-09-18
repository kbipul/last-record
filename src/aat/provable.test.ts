import { describe, it, expect } from 'vitest';
import { verifyChain } from './chain';
import { assessProvability, type Claim } from './provable';
import { MIDDLE_EDIT, SEALED, TAIL_CUT } from './scenarios';

const assess = (records: typeof SEALED): Claim[] =>
  assessProvability({ records, chain: verifyChain(records) });

const claim = (records: typeof SEALED, id: string): Claim =>
  assess(records).find((c) => c.id === id)!;

describe('assessProvability', () => {
  it('proves the middle-edit question on an intact chain', () => {
    expect(claim(SEALED, 'middle-edit').verdict).toBe('proved');
  });

  it('withdraws the middle-edit claim once the chain is broken', () => {
    expect(claim(MIDDLE_EDIT, 'middle-edit').verdict).toBe('unprovable');
  });

  it('calls tail truncation conditional while a terminator is present', () => {
    const c = claim(SEALED, 'tail-cut');
    expect(c.verdict).toBe('conditional');
    expect(c.because).toMatch(/convention/);
  });

  it('drops tail truncation to unprovable once the terminator is cut away', () => {
    expect(claim(TAIL_CUT, 'tail-cut').verdict).toBe('unprovable');
  });

  it('never claims completeness, even on a perfect chain', () => {
    expect(claim(SEALED, 'omission').verdict).toBe('unprovable');
  });

  it('notes contiguous sequence numbers without upgrading the completeness verdict', () => {
    const c = claim(SEALED, 'omission');
    expect(c.because).toMatch(/contiguous/);
    expect(c.verdict).toBe('unprovable');
  });

  it('treats an unsigned log as forgeable by its own holder', () => {
    expect(claim(SEALED, 'authorship').verdict).toBe('unprovable');
  });

  it('upgrades authorship only when every record is signed', () => {
    const signed = SEALED.map((r) => ({ ...r, signature: 'ecdsa:stub' }));
    expect(claim(signed, 'authorship').verdict).toBe('proved');
  });

  it('does not upgrade authorship on a partly signed log', () => {
    const partly = SEALED.map((r, i) => (i < 3 ? { ...r, signature: 'ecdsa:stub' } : { ...r }));
    expect(claim(partly, 'authorship').verdict).toBe('unprovable');
  });

  it('never proves timing from the log alone', () => {
    expect(claim(SEALED, 'timing').verdict).toBe('unprovable');
  });

  it('gives every unprovable claim something concrete that would fix it', () => {
    for (const c of assess(SEALED)) {
      if (c.verdict !== 'proved') expect(c.wouldTake).toBeTruthy();
    }
  });

  it('returns the same five claims whatever the log', () => {
    expect(assess(SEALED).map((c) => c.id)).toEqual(assess(TAIL_CUT).map((c) => c.id));
  });
});
