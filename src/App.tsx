import { useMemo, useState } from 'react';
import { reseal, verifyChain } from './aat/chain';
import { checkConformance } from './aat/conformance';
import { assessProvability } from './aat/provable';
import { SCENARIOS, parseJsonl, toJsonl } from './aat/scenarios';
import type { AatRecord } from './aat/schema';
import { ChainView } from './components/ChainView';
import { ConformancePanel } from './components/ConformancePanel';
import { VerdictPanel } from './components/VerdictPanel';

export default function App() {
  const [text, setText] = useState(() => toJsonl(SCENARIOS[0].records));
  const [activeId, setActiveId] = useState(SCENARIOS[0].id);

  const { records, errors } = useMemo(() => parseJsonl(text), [text]);
  const chain = useMemo(() => verifyChain(records), [records]);
  const conformance = useMemo(() => checkConformance(records), [records]);
  const claims = useMemo(() => assessProvability({ records, chain }), [records, chain]);

  const load = (id: string, recs: AatRecord[]) => {
    setActiveId(id);
    setText(toJsonl(recs));
  };

  const cutLast = () => {
    if (records.length === 0) return;
    setActiveId('edited');
    setText(toJsonl(records.slice(0, -1)));
  };

  const resealNow = () => {
    if (records.length === 0) return;
    setActiveId('edited');
    setText(toJsonl(reseal(records)));
  };

  const verdict = records.length === 0 ? 'empty' : chain.intact ? 'intact' : 'broken';

  return (
    <div className="app">
      <header>
        <h1>Last Record</h1>
        <p className="lede">
          The IETF <code>draft-sharif-agent-audit-trail</code> hash-chains agent tool-call
          records so a reviewer can tell whether a log was edited. The draft expires on 29
          September 2026, eleven days from this build, while EU AI Act Article 12 has required
          automatic event logging from high-risk systems since 2 August. So it is worth being
          exact about what a verified chain actually establishes.
        </p>
        <p className="lede">
          Load the sealed session, then press <em>Drop the last record</em> three times. The
          refund attempt, the escalation and the session close all disappear, and the chain goes
          on verifying.
        </p>
      </header>

      <section className="controls">
        <div className="scenarios">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              className={activeId === s.id ? 'active' : ''}
              onClick={() => load(s.id, s.records)}
              title={s.blurb}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="edits">
          <button onClick={cutLast} disabled={records.length === 0}>
            Drop the last record
          </button>
          <button onClick={resealNow} disabled={records.length === 0}>
            Re-seal the chain
          </button>
        </div>
      </section>

      <p className="blurb">
        {SCENARIOS.find((s) => s.id === activeId)?.blurb ??
          'Edited in the browser. The chain below is recomputed from these bytes.'}
      </p>

      <section className="grid">
        <div className="col">
          <h2>
            The chain
            <span className={`badge ${verdict}`}>
              {verdict === 'intact'
                ? `verified · ${records.length} records`
                : verdict === 'broken'
                  ? `breaks at record ${(chain.firstBreak ?? 0) + 1}`
                  : 'nothing loaded'}
            </span>
          </h2>
          <ChainView records={records} chain={chain} />
          {chain.head && (
            <p className="head">
              head <code>{chain.head.slice(0, 24)}…</code>
            </p>
          )}

          <h2>The log</h2>
          <textarea
            spellCheck={false}
            value={text}
            onChange={(e) => {
              setActiveId('edited');
              setText(e.target.value);
            }}
            aria-label="Agent audit log as JSON Lines"
          />
          {errors.length > 0 && (
            <ul className="parse-errors">
              {errors.slice(0, 5).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}

          <h2>Conformance</h2>
          <ConformancePanel report={conformance} />
        </div>

        <div className="col">
          <h2>What this log can and cannot prove</h2>
          <VerdictPanel claims={claims} />
        </div>
      </section>

      <footer>
        <p>
          Every hash on this page was computed in your tab. The SHA-256 is written out in{' '}
          <code>src/aat/sha256.ts</code> and checked against the NIST vectors, so you can read the
          thing doing the verifying.
        </p>
        <p>
          <a href="https://github.com/kbipul/last-record">Source</a> ·{' '}
          <a href="https://github.com/kbipul/kb-daily-builds">kb-daily-builds</a> · Built by{' '}
          <a href="https://www.kumarbipul.com">Kumar Bipul</a>
        </p>
      </footer>
    </div>
  );
}
