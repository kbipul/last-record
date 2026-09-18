/**
 * The record shape this tool checks against.
 *
 * Source caveat, and it matters: datatracker.ietf.org was down for a platform
 * upgrade throughout this build ("This site is currently being upgraded"), so
 * the draft text could not be read directly. The field set below is
 * reconstructed from secondary descriptions of draft-sharif-agent-audit-trail
 * -03 — twelve mandatory fields per record, seven action classifications,
 * trust levels L0 through L4, SHA-256 hash chaining over RFC 8785
 * canonical JSON, optional ECDSA signatures.
 *
 * Field *names* are the reconstruction's weakest point. The classifications,
 * the level range and the chaining construction are attested by more than one
 * source; the exact spelling of `input_hash` versus `inputHash` is not. The UI
 * says so on the findings panel, and RULESET_PROVENANCE below is rendered
 * rather than buried.
 */

export const RULESET_PROVENANCE =
  'Reconstructed from secondary sources on 2026-09-18 — datatracker.ietf.org was ' +
  'mid-upgrade and served no draft text. Field names are the least certain part.';

/** The seven action classifications. */
export const ACTION_TYPES = [
  'tool_call',
  'tool_response',
  'decision',
  'delegation',
  'escalation',
  'error',
  'lifecycle',
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const TRUST_LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4'] as const;
export type TrustLevel = (typeof TRUST_LEVELS)[number];

export const OUTCOMES = ['success', 'failure', 'denied', 'partial'] as const;

/** The twelve mandatory fields, in the order the findings panel lists them. */
export const MANDATORY_FIELDS = [
  'aat_version',
  'record_id',
  'timestamp',
  'agent_id',
  'session_id',
  'action_type',
  'action_target',
  'input_hash',
  'output_hash',
  'outcome',
  'trust_level',
  'prev_hash',
] as const;
export type MandatoryField = (typeof MANDATORY_FIELDS)[number];

/**
 * `record_hash` is deliberately NOT mandatory-listed: it is the hash *of* the
 * record, so it cannot be inside the bytes being hashed. It is stripped before
 * canonicalization. See chain.ts.
 */
export const HASH_FIELD = 'record_hash';

export type AatRecord = Record<string, unknown>;
