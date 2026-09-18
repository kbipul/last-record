import type { ConformanceReport } from '../aat/conformance';
import { RULESET_PROVENANCE } from '../aat/schema';

export function ConformancePanel({ report }: { report: ConformanceReport }) {
  const errors = report.findings.filter((f) => f.severity === 'error');
  const warns = report.findings.filter((f) => f.severity === 'warn');

  // Collapse per-record repetition: the same missing field on 9 records is one problem.
  const byField = new Map<string, number>();
  for (const f of errors) byField.set(f.field, (byField.get(f.field) ?? 0) + 1);
  const grouped = [...byField.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="conformance">
      <p className="tally">
        <strong>{report.conformingRecords}</strong> of {report.totalRecords} records carry the
        twelve mandatory fields with valid values. {errors.length} errors, {warns.length} warnings.
      </p>

      {report.neverEmitted.length > 0 && (
        <p className="never">
          Never emitted anywhere in this log:{' '}
          {report.neverEmitted.map((f) => (
            <code key={f}>{f}</code>
          ))}
        </p>
      )}

      {grouped.length > 0 && (
        <ul className="findings">
          {grouped.map(([field, count]) => {
            const sample = errors.find((f) => f.field === field)!;
            return (
              <li key={field}>
                <code>{field}</code> — {sample.message.replace(`"${field}" `, '')}{' '}
                <span className="dim">({count === 1 ? 'record 1' : `${count} records`})</span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="provenance">{RULESET_PROVENANCE}</p>
    </div>
  );
}
