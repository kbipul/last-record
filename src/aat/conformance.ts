import {
  ACTION_TYPES,
  HASH_FIELD,
  MANDATORY_FIELDS,
  OUTCOMES,
  TRUST_LEVELS,
  type AatRecord,
} from './schema';

export type Severity = 'error' | 'warn';

export interface Finding {
  index: number;
  field: string;
  severity: Severity;
  message: string;
}

export interface ConformanceReport {
  findings: Finding[];
  /** Records with zero error-severity findings. */
  conformingRecords: number;
  totalRecords: number;
  /** Mandatory fields absent from EVERY record — i.e. the emitter never writes them. */
  neverEmitted: string[];
}

export function checkConformance(records: AatRecord[]): ConformanceReport {
  const findings: Finding[] = [];
  const seenFields = new Set<string>();
  const seenIds = new Map<string, number>();

  records.forEach((rec, index) => {
    for (const key of Object.keys(rec)) seenFields.add(key);

    for (const field of MANDATORY_FIELDS) {
      const value = rec[field];
      if (value === undefined || value === null || value === '') {
        findings.push({
          index,
          field,
          severity: 'error',
          message: `mandatory field "${field}" is missing`,
        });
      }
    }

    const action = rec['action_type'];
    if (typeof action === 'string' && !ACTION_TYPES.includes(action as never)) {
      findings.push({
        index,
        field: 'action_type',
        severity: 'error',
        message: `"${action}" is not one of the seven classifications`,
      });
    }

    const trust = rec['trust_level'];
    if (typeof trust === 'string' && !TRUST_LEVELS.includes(trust as never)) {
      findings.push({
        index,
        field: 'trust_level',
        severity: 'error',
        message: `"${trust}" is outside L0-L4`,
      });
    }

    const outcome = rec['outcome'];
    if (typeof outcome === 'string' && !OUTCOMES.includes(outcome as never)) {
      findings.push({
        index,
        field: 'outcome',
        severity: 'warn',
        message: `"${outcome}" is not a recognised outcome value`,
      });
    }

    const ts = rec['timestamp'];
    if (typeof ts === 'string' && Number.isNaN(Date.parse(ts))) {
      findings.push({
        index,
        field: 'timestamp',
        severity: 'error',
        message: `"${ts}" is not a parseable timestamp`,
      });
    }

    const id = rec['record_id'];
    if (typeof id === 'string' && id !== '') {
      const first = seenIds.get(id);
      if (first !== undefined) {
        findings.push({
          index,
          field: 'record_id',
          severity: 'error',
          message: `record_id repeats index ${first}`,
        });
      } else {
        seenIds.set(id, index);
      }
    }

    if (rec[HASH_FIELD] === undefined) {
      findings.push({
        index,
        field: HASH_FIELD,
        severity: 'warn',
        message: 'no record_hash — this record cannot take part in a chain',
      });
    }
  });

  const errorsByIndex = new Set(
    findings.filter((f) => f.severity === 'error').map((f) => f.index),
  );

  const neverEmitted = records.length
    ? MANDATORY_FIELDS.filter((f) => !seenFields.has(f))
    : [];

  return {
    findings,
    conformingRecords: records.length - errorsByIndex.size,
    totalRecords: records.length,
    neverEmitted: [...neverEmitted],
  };
}
