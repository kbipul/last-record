import type { ChainReport } from '../aat/chain';
import type { AatRecord } from '../aat/schema';

const SHORT = (h: string | null) => (h ? h.slice(0, 12) : '—');

const LABEL: Record<string, string> = {
  ok: 'linked',
  hash_mismatch: 'hash mismatch',
  link_broken: 'orphaned',
  unhashed: 'no hash',
};

export function ChainView({ records, chain }: { records: AatRecord[]; chain: ChainReport }) {
  if (records.length === 0) {
    return <p className="empty">Nothing loaded. Pick a sample above, or paste a log.</p>;
  }

  return (
    <table className="chain">
      <thead>
        <tr>
          <th>#</th>
          <th>action</th>
          <th>target</th>
          <th>hash</th>
          <th>link</th>
        </tr>
      </thead>
      <tbody>
        {chain.links.map((link) => {
          const rec = records[link.index];
          return (
            <tr key={link.index} className={link.status === 'ok' ? '' : 'bad'}>
              <td className="num">{link.index + 1}</td>
              <td className="mono">{String(rec['action_type'] ?? rec['event'] ?? '—')}</td>
              <td className="mono dim">{String(rec['action_target'] ?? rec['tool'] ?? '—')}</td>
              <td className="mono dim" title={link.computed ?? ''}>
                {SHORT(link.computed)}
              </td>
              <td>
                <span className={`chip ${link.status}`}>{LABEL[link.status]}</span>
                {link.status !== 'ok' && <span className="detail">{link.detail}</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
