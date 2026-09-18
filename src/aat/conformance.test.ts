import { describe, it, expect } from 'vitest';
import { checkConformance } from './conformance';
import { MANDATORY_FIELDS } from './schema';
import { SCENARIOS, SEALED } from './scenarios';

const harness = SCENARIOS.find((s) => s.id === 'harness')!.records;

describe('checkConformance', () => {
  it('passes every record of the sealed sample', () => {
    const report = checkConformance(SEALED);
    expect(report.findings.filter((f) => f.severity === 'error')).toEqual([]);
    expect(report.conformingRecords).toBe(SEALED.length);
  });

  it('finds every mandatory field missing from a bare record', () => {
    const report = checkConformance([{}]);
    const missing = report.findings.filter((f) => f.message.includes('is missing'));
    expect(missing).toHaveLength(MANDATORY_FIELDS.length);
  });

  it('names the fields a harness log never emits at all', () => {
    const report = checkConformance(harness);
    expect(report.neverEmitted).toContain('agent_id');
    expect(report.neverEmitted).toContain('trust_level');
    expect(report.neverEmitted).toContain('session_id');
    expect(report.conformingRecords).toBe(0);
  });

  it('rejects an action_type outside the seven classifications', () => {
    const rec = { ...SEALED[2], action_type: 'tool_invoke' };
    const f = checkConformance([rec]).findings.find((x) => x.field === 'action_type');
    expect(f?.message).toMatch(/not one of the seven/);
  });

  it('rejects a trust level outside L0-L4', () => {
    const rec = { ...SEALED[2], trust_level: 'L7' };
    const f = checkConformance([rec]).findings.find((x) => x.field === 'trust_level');
    expect(f?.severity).toBe('error');
  });

  it('warns rather than errors on an unrecognised outcome', () => {
    const rec = { ...SEALED[2], outcome: 'weird' };
    const f = checkConformance([rec]).findings.find((x) => x.field === 'outcome');
    expect(f?.severity).toBe('warn');
  });

  it('rejects an unparseable timestamp', () => {
    const rec = { ...SEALED[2], timestamp: 'last tuesday' };
    const f = checkConformance([rec]).findings.find((x) => x.field === 'timestamp');
    expect(f?.severity).toBe('error');
  });

  it('catches a repeated record_id and points at the first use', () => {
    const dup = [SEALED[2], { ...SEALED[3], record_id: SEALED[2].record_id }];
    const f = checkConformance(dup).findings.find((x) => x.field === 'record_id');
    expect(f?.message).toMatch(/repeats index 0/);
  });

  it('reports no never-emitted fields for an empty log', () => {
    expect(checkConformance([]).neverEmitted).toEqual([]);
  });
});
