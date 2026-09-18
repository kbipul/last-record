import { reseal } from './chain';
import type { AatRecord } from './schema';

/**
 * One session, four ways. The narrative is a support-triage agent that looks a
 * customer up, reads an invoice, tries to issue a refund, and is denied.
 *
 * The bodies are written without hashes and sealed at module load, so the
 * sample chains are always internally consistent and there are no hand-copied
 * digests to rot.
 */

const SESSION = 'sess-2f9c41';
const AGENT = 'agent://acme/support-triage';

function body(
  seq: number,
  timestamp: string,
  action_type: string,
  action_target: string,
  outcome: string,
  trust_level: string,
  input_hash: string,
  output_hash: string,
): AatRecord {
  return {
    aat_version: '0.3',
    record_id: `rec-${String(seq).padStart(4, '0')}`,
    sequence: seq,
    timestamp,
    agent_id: AGENT,
    session_id: SESSION,
    action_type,
    action_target,
    input_hash: `sha256:${input_hash}`,
    output_hash: `sha256:${output_hash}`,
    outcome,
    trust_level,
    prev_hash: '',
  };
}

const BASE: AatRecord[] = [
  body(1, '2026-09-17T09:14:02.118Z', 'lifecycle', 'session.start', 'success', 'L3', 'e3b0c442', 'e3b0c442'),
  body(2, '2026-09-17T09:14:02.904Z', 'decision', 'route:billing_dispute', 'success', 'L3', '9f2c1a77', '41be8d05'),
  body(3, '2026-09-17T09:14:03.551Z', 'tool_call', 'crm.lookup_customer', 'success', 'L3', '41be8d05', 'c7a19e3b'),
  body(4, '2026-09-17T09:14:04.220Z', 'tool_response', 'crm.lookup_customer', 'success', 'L1', 'c7a19e3b', 'd80f2a16'),
  body(5, '2026-09-17T09:14:05.083Z', 'tool_call', 'billing.read_invoice', 'success', 'L3', 'd80f2a16', '5b3e7c90'),
  body(6, '2026-09-17T09:14:06.017Z', 'tool_response', 'billing.read_invoice', 'success', 'L1', '5b3e7c90', 'a2d4f188'),
  body(7, '2026-09-17T09:14:07.442Z', 'tool_call', 'billing.issue_refund', 'denied', 'L3', 'a2d4f188', '0000e5c1'),
  body(8, '2026-09-17T09:14:07.889Z', 'escalation', 'queue:human_review', 'success', 'L3', '0000e5c1', '7c61b0da'),
  body(9, '2026-09-17T09:14:08.310Z', 'lifecycle', 'session.end', 'success', 'L3', '7c61b0da', '7c61b0da'),
];

/** A harness log as they actually arrive: flat, unchained, three fields short. */
const HARNESS_LOG: AatRecord[] = [
  { ts: '2026-09-17T09:14:03Z', event: 'tool_call', tool: 'crm.lookup_customer', status: 'ok' },
  { ts: '2026-09-17T09:14:04Z', event: 'tool_result', tool: 'crm.lookup_customer', status: 'ok' },
  { ts: '2026-09-17T09:14:05Z', event: 'tool_call', tool: 'billing.read_invoice', status: 'ok' },
  { ts: '2026-09-17T09:14:06Z', event: 'tool_result', tool: 'billing.read_invoice', status: 'ok' },
  { ts: '2026-09-17T09:14:07Z', event: 'tool_call', tool: 'billing.issue_refund', status: 'denied' },
];

export const SEALED: AatRecord[] = reseal(BASE);

/** Index 4's target is rewritten after sealing. Its hash no longer fits. */
export const MIDDLE_EDIT: AatRecord[] = SEALED.map((rec, i) =>
  i === 4 ? { ...rec, action_target: 'billing.read_invoice_v2' } : { ...rec },
);

/** The last three records are gone. Every remaining link still checks out. */
export const TAIL_CUT: AatRecord[] = SEALED.slice(0, 6).map((r) => ({ ...r }));

export interface Scenario {
  id: string;
  label: string;
  blurb: string;
  records: AatRecord[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'sealed',
    label: 'Sealed session',
    blurb: 'Nine records, chained end to end, closed with a lifecycle record. This is the shape the draft asks for.',
    records: SEALED,
  },
  {
    id: 'tail-cut',
    label: 'Three records short',
    blurb: 'The same session with the refund attempt, the escalation and the close removed. Read the verdict panel, not the badge.',
    records: TAIL_CUT,
  },
  {
    id: 'middle-edit',
    label: 'One record rewritten',
    blurb: 'A tool target changed after sealing. This is the case hash chaining was built for, and it is caught immediately.',
    records: MIDDLE_EDIT,
  },
  {
    id: 'harness',
    label: 'What a harness emits',
    blurb: 'A plain agent log with no chain and no identity fields — the starting point most teams are actually at.',
    records: HARNESS_LOG,
  },
];

export function toJsonl(records: AatRecord[]): string {
  return records.map((r) => JSON.stringify(r)).join('\n');
}

export function parseJsonl(text: string): { records: AatRecord[]; errors: string[] } {
  const records: AatRecord[] = [];
  const errors: string[] = [];
  const trimmed = text.trim();
  if (!trimmed) return { records, errors };

  // Accept a JSON array as well as JSON Lines — exports arrive both ways.
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        errors.push('top-level JSON is not an array of records');
        return { records, errors };
      }
      parsed.forEach((r, i) => {
        if (r && typeof r === 'object' && !Array.isArray(r)) records.push(r as AatRecord);
        else errors.push(`element ${i} is not an object`);
      });
      return { records, errors };
    } catch (e) {
      errors.push(`could not parse as JSON array: ${(e as Error).message}`);
      return { records, errors };
    }
  }

  trimmed.split('\n').forEach((line, i) => {
    const l = line.trim();
    if (!l) return;
    try {
      const parsed = JSON.parse(l);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        records.push(parsed as AatRecord);
      } else {
        errors.push(`line ${i + 1} is not a JSON object`);
      }
    } catch (e) {
      errors.push(`line ${i + 1}: ${(e as Error).message}`);
    }
  });

  return { records, errors };
}
