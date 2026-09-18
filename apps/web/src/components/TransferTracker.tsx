'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  formatUsdc,
  generateSimulatedTransfers,
  SIMULATED_TARGET_ADDRESS,
  SUBGRAPH_QUERY,
  SUBGRAPH_SCHEMA,
  truncateHex,
  type SimulatedTransfer,
} from '@merkle-verify/core';
import { Badge } from './Badge';
import { Button } from './Button';
import { PageHeader, Panel } from './Section';

const PAGE_SIZE = 8;

/**
 * Simulated transfer feed.
 *
 * This renders synthetic data and says so on every surface. The original
 * project polled a Graph subgraph from an always-on backend and pushed via
 * Firebase; that needs an indexer, a Google account, a real device token and a
 * process that never sleeps — none of which a visitor can exercise and none of
 * which fits a free serverless tier. The query that a live deployment would
 * run is shown verbatim below instead of being quietly dropped.
 */
export function TransferTracker() {
  const [seed, setSeed] = useState(20241123);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');

  const all = useMemo(
    // Pinned reference time keeps the list stable across renders.
    () => generateSimulatedTransfers(36, seed, 1_763_000_000),
    [seed],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (t) => t.from.toLowerCase().includes(q) || t.transactionHash.toLowerCase().includes(q),
    );
  }, [all, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const refresh = useCallback(() => {
    setSeed((s) => s + 1);
    setPage(0);
  }, []);

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Simulated"
        title="Transfer Tracker"
        description="Watching an address for incoming token transfers means indexing chain events and querying them. This page shows that interface running on generated data, next to the exact subgraph query a live deployment would issue."
        aside={
          <Button variant="secondary" size="sm" onClick={refresh}>
            Regenerate feed
          </Button>
        }
      />

      <div
        role="note"
        className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-warn-border bg-warn-muted px-4 py-3"
      >
        <Badge tone="warn">Simulated data</Badge>
        <p className="text-xs leading-relaxed text-warn-text">
          These transfers are generated in your browser. They are not real transactions, and these
          addresses belong to nobody. Nothing here queries a chain.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <Panel
          title="Incoming transfers"
          description={`Watching ${truncateHex(SIMULATED_TARGET_ADDRESS, 10, 8)}`}
          actions={<Badge tone="neutral">{filtered.length} records</Badge>}
        >
          <div className="mb-4">
            <label htmlFor="transfer-search" className="sr-only">
              Filter by sender or transaction hash
            </label>
            <input
              id="transfer-search"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Filter by sender or tx hash…"
              className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-xs text-ink-100 placeholder:text-ink-500 hover:border-ink-600"
            />
          </div>

          {rows.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-ink-300">No transfers match “{query}”.</p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setQuery('')}>
                Clear filter
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-left">
                  <caption className="sr-only">
                    Simulated incoming token transfers, newest first
                  </caption>
                  <thead>
                    <tr className="border-b border-ink-700">
                      {['From', 'Amount', 'When', 'Transaction'].map((h) => (
                        <th
                          key={h}
                          scope="col"
                          className="pb-2 text-2xs font-medium uppercase tracking-wider text-ink-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((transfer) => (
                      <TransferRow key={transfer.id} transfer={transfer} />
                    ))}
                  </tbody>
                </table>
              </div>

              {pageCount > 1 ? (
                <nav
                  aria-label="Pagination"
                  className="mt-4 flex items-center justify-between border-t border-ink-700 pt-3"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={safePage === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    ← Previous
                  </Button>
                  <span className="text-2xs text-ink-500">
                    Page {safePage + 1} of {pageCount}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={safePage >= pageCount - 1}
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  >
                    Next →
                  </Button>
                </nav>
              ) : null}
            </>
          )}
        </Panel>

        <div className="min-w-0 space-y-5">
          <Panel
            title="The real query"
            description="What a deployed subgraph would be asked, verbatim."
          >
            <pre className="overflow-x-auto rounded-lg border border-ink-700 bg-ink-950 p-3 font-mono text-2xs leading-relaxed text-ink-300">
              <code>{SUBGRAPH_QUERY}</code>
            </pre>
          </Panel>

          <Panel title="Entity schema" description="The indexed shape behind that query.">
            <pre className="overflow-x-auto rounded-lg border border-ink-700 bg-ink-950 p-3 font-mono text-2xs leading-relaxed text-ink-300">
              <code>{SUBGRAPH_SCHEMA}</code>
            </pre>
          </Panel>

          <div className="rounded-xl border border-ink-700 bg-ink-900 p-4">
            <h3 className="text-xs font-semibold text-ink-200">Why this one is simulated</h3>
            <p className="mt-2 text-2xs leading-relaxed text-ink-400">
              A live feed needs a deployed indexer, an API key, and a process that polls without
              sleeping. Free serverless tiers cap scheduled work at roughly once a day and keep no
              memory between invocations, so a visitor would reliably find an empty table. A
              labelled simulation demonstrates the same interface and stays honest about it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransferRow({ transfer }: { transfer: SimulatedTransfer }) {
  const when = new Date(transfer.timestamp * 1000);
  return (
    <tr className="border-b border-ink-800 last:border-0 hover:bg-ink-800/40">
      <td className="py-2.5 pr-3 font-mono text-2xs text-ink-300">
        {truncateHex(transfer.from, 8, 6)}
      </td>
      <td className="py-2.5 pr-3 font-mono text-xs tabular-nums text-ink-100">
        {formatUsdc(transfer.value)}
        <span className="ml-1 text-2xs text-ink-500">USDC</span>
      </td>
      <td className="py-2.5 pr-3 text-2xs text-ink-400">
        <time dateTime={when.toISOString()}>
          {when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </time>
      </td>
      <td className="py-2.5 font-mono text-2xs">
        <span
          className="text-ink-500"
          title="Simulated — there is no such transaction to link to"
        >
          {truncateHex(transfer.transactionHash, 8, 6)}
        </span>
      </td>
    </tr>
  );
}
