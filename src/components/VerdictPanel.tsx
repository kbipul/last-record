import type { Claim } from '../aat/provable';

const WORD: Record<Claim['verdict'], string> = {
  proved: 'the log proves this',
  conditional: 'only by convention',
  unprovable: 'the log cannot say',
};

export function VerdictPanel({ claims }: { claims: Claim[] }) {
  return (
    <div className="claims">
      {claims.map((c) => (
        <article key={c.id} className={`claim ${c.verdict}`}>
          <h3>{c.question}</h3>
          <span className={`chip ${c.verdict}`}>{WORD[c.verdict]}</span>
          <p>{c.because}</p>
          {c.wouldTake && (
            <p className="would">
              <span>Would take:</span> {c.wouldTake}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
