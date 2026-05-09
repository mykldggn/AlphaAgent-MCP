'use client';

import { useEffect, useState, useRef } from 'react';
import type { Tick } from '@/app/api/ticker/route';

// ── Types ──────────────────────────────────────────────────────────────────────

export type SignalType = 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG SELL';

export interface SignalEntry {
  id: string;
  ticker: string;
  signal: SignalType;
  confidence: number;
  timestamp: Date;
}

export interface ActivityEntry {
  id: string;
  icon: string;
  text: string;
  timestamp: Date;
}

interface Props {
  signals: SignalEntry[];
  activity: ActivityEntry[];
}

// ── Signal styling ─────────────────────────────────────────────────────────────

const SIGNAL_STYLE: Record<SignalType, { color: string; bg: string; dot: string }> = {
  'STRONG BUY':  { color: 'text-emerald-400', bg: 'bg-emerald-950/60 border-emerald-800/60', dot: 'bg-emerald-400' },
  'BUY':         { color: 'text-green-400',   bg: 'bg-green-950/60 border-green-800/60',     dot: 'bg-green-400'   },
  'HOLD':        { color: 'text-amber-400',   bg: 'bg-amber-950/60 border-amber-800/60',     dot: 'bg-amber-400'   },
  'SELL':        { color: 'text-orange-400',  bg: 'bg-orange-950/60 border-orange-800/60',   dot: 'bg-orange-400'  },
  'STRONG SELL': { color: 'text-red-400',     bg: 'bg-red-950/60 border-red-800/60',         dot: 'bg-red-400'     },
};

// ── Live market strip ──────────────────────────────────────────────────────────

function MarketStrip() {
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTicks = async () => {
    try {
      const data = await fetch('/api/ticker').then((r) => r.json());
      setTicks(data);
      setLastUpdated(new Date());
    } catch {
      // keep stale data on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicks();
    const id = setInterval(fetchTicks, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="px-3 py-3 space-y-1.5">
      {loading && ticks.length === 0 ? (
        <p className="text-gray-700 text-[11px] font-mono italic">Fetching live data...</p>
      ) : (
        ticks.map((t) => {
          const up = t.changePercent >= 0;
          return (
            <div key={t.symbol} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${up ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-[11px] font-mono text-gray-400">{t.label}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-mono text-white">
                  {t.symbol === 'BTC'
                    ? `$${t.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                    : `$${t.price.toFixed(2)}`}
                </span>
                <span className={`ml-2 text-[10px] font-mono ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                  {up ? '▲' : '▼'} {Math.abs(t.changePercent).toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })
      )}
      {lastUpdated && (
        <p className="text-[9px] text-gray-700 font-mono pt-0.5">
          Updated {lastUpdated.toLocaleTimeString()} · refreshes every 30s
        </p>
      )}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export function SignalPanel({ signals, activity }: Props) {
  return (
    <aside className="w-64 shrink-0 border-l border-[#1f2937] bg-[#080d12] flex flex-col overflow-hidden font-mono">

      {/* ── Live Market ── */}
      <div>
        <SectionHeader live>LIVE MARKET</SectionHeader>
        <MarketStrip />
      </div>

      <Divider />

      {/* ── Session Signals ── */}
      <div className="flex-none">
        <SectionHeader>SESSION SIGNALS</SectionHeader>
        <div className="px-3 pb-3 space-y-2">
          {signals.length === 0 ? (
            <p className="text-gray-700 italic text-[11px]">
              Signals appear after each analysis
            </p>
          ) : (
            [...signals].reverse().map((s) => {
              const style = SIGNAL_STYLE[s.signal];
              return (
                <div
                  key={s.id}
                  className={`rounded border px-2.5 py-2 ${style.bg}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                      <span className="text-white text-[11px] font-semibold">{s.ticker}</span>
                    </div>
                    <span className="text-[10px] text-gray-500">
                      {s.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-[11px] font-bold ${style.color}`}>{s.signal}</span>
                    <span className="text-[10px] text-gray-500">{s.confidence}% confidence</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Divider />

      {/* ── Agent Activity ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <SectionHeader>AGENT ACTIVITY</SectionHeader>
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
          {activity.length === 0 ? (
            <p className="text-gray-700 italic text-[11px]">
              Tool calls appear here as the agent works
            </p>
          ) : (
            [...activity].reverse().map((a) => (
              <div key={a.id} className="flex items-start gap-2">
                <span className="text-base leading-none mt-0.5 shrink-0">{a.icon}</span>
                <span className="text-[11px] text-gray-400 leading-snug">{a.text}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-[#1f2937] px-3 py-2 space-y-0.5 text-[10px] text-gray-700">
        <p>Stocks: <span className="text-gray-600">Finnhub</span> · Crypto: <span className="text-gray-600">CoinGecko</span></p>
        <p>MCP 2024-11-05 · claude-sonnet-4-6</p>
      </div>
    </aside>
  );
}

function SectionHeader({ children, live }: { children: React.ReactNode; live?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1f2937]">
      {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />}
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{children}</span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-[#1f2937]" />;
}
