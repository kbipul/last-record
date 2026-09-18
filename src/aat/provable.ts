import type { ChainReport } from './chain';
import type { AatRecord } from './schema';

/**
 * A hash chain proves one thing well and several things not at all. This
 * module is the part of the tool that says which is which, because a green
 * "chain verified" badge is read as "this log is complete" and it never
 * meant that.
 */

export type Verdict = 'proved' | 'conditional' | 'unprovable';

export interface Claim {
  id: string;
  /** Written as a reviewer would say it out loud. */
  question: string;
  verdict: Verdict;
  because: string;
  /** What you would have to add to move the verdict up. */
  wouldTake: string | null;
}

export interface ProvabilityInput {
  records: AatRecord[];
  chain: ChainReport;
}

/** A record that closes the session — the only in-band hint that a tail is missing. */
function hasTerminator(records: AatRecord[]): boolean {
  if (records.length === 0) return false;
  const last = records[records.length - 1];
  if (last['action_type'] !== 'lifecycle') return false;
  const target = String(last['action_target'] ?? '').toLowerCase();
  return target.includes('end') || target.includes('close') || target.includes('stop');
}

function hasSequenceNumbers(records: AatRecord[]): boolean {
  return records.length > 0 && records.every((r) => typeof r['sequence'] === 'number');
}

/** A sequence that starts at 0 or 1 and never skips still says nothing about its own end. */
function sequenceIsContiguous(records: AatRecord[]): boolean {
  if (!hasSequenceNumbers(records)) return false;
  const nums = records.map((r) => r['sequence'] as number);
  return nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
}

export function assessProvability({ records, chain }: ProvabilityInput): Claim[] {
  const chainWorks = chain.intact && records.length > 0;
  const signed = chain.signedRecords > 0 && chain.signedRecords === records.length;

  const claims: Claim[] = [];

  claims.push({
    id: 'middle-edit',
    question: 'Was a record in the middle of this log changed after it was written?',
    verdict: chainWorks ? 'proved' : 'unprovable',
    because: chainWorks
      ? 'Every record hashes to its declared value and every prev_hash matches its predecessor. Editing one record changes its hash and orphans everything after it.'
      : 'The chain does not verify as it stands, so it cannot rule anything out. Fix the break before reading any other line on this panel.',
    wouldTake: chainWorks ? null : 'a chain that verifies end to end',
  });

  claims.push({
    id: 'tail-cut',
    question: 'Was anything removed from the end of this log?',
    verdict: hasTerminator(records) ? 'conditional' : 'unprovable',
    because: hasTerminator(records)
      ? 'The last record closes the session, so a reviewer who knows every session ends with one would notice it gone. That is a convention holding the line, not the hash chain — cut the terminator too and the shorter log verifies.'
      : 'A hash chain links each record backwards. Nothing in it points forward, and no record states how many should follow. Drop records off the end and every remaining link still checks out.',
    wouldTake:
      'the head hash published somewhere the log holder cannot rewrite — a counter-signature, a transparency log, an external witness',
  });

  claims.push({
    id: 'omission',
    question: 'Is every action the agent took in here?',
    verdict: 'unprovable',
    because:
      'A tool call that was never written leaves no gap to find. Chaining protects records that exist; it has nothing to say about the ones that do not.' +
      (sequenceIsContiguous(records)
        ? ' The sequence numbers here run contiguously, which rules out a record removed from the middle — and says nothing about one that was never emitted.'
        : ''),
    wouldTake: 'logging at the point of execution, enforced somewhere the agent cannot reach',
  });

  claims.push({
    id: 'authorship',
    question: 'Could whoever holds this log have produced it themselves?',
    verdict: signed ? 'proved' : 'unprovable',
    because: signed
      ? `All ${chain.signedRecords} records carry a signature, so a forged log needs the signing key, not just the file.`
      : 'The hashes are computed from the records with a public algorithm and no secret. Anyone holding the file can write a different history and re-seal it into a chain that verifies exactly as cleanly as this one.',
    wouldTake: signed ? null : 'per-record signatures under a key the log holder does not have',
  });

  claims.push({
    id: 'timing',
    question: 'Did these actions happen when the timestamps say?',
    verdict: 'unprovable',
    because:
      'Timestamps are fields inside the records. They are covered by the hash, so they cannot be changed after sealing — but they were whatever the emitter wrote at sealing time, and the chain has no independent clock.',
    wouldTake: 'an external timestamp authority over the head hash',
  });

  return claims;
}
