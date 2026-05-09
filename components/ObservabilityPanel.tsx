'use client';

import { Activity, Zap, DollarSign, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export interface ToolCallEntry {
  id: string;
  name: string;
  args: Record<string, unknown>;
  durationMs?: number;
  timestamp: Date;
  success: boolean;
}

export interface ObsData {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  toolCalls: ToolCallEntry[];
  lastLatencyMs: number | null;
}

// Claude claude-sonnet-4-6 pricing (per million tokens)
const PRICE_INPUT  = 3.00;
const PRICE_OUTPUT = 15.00;

function usd(n: number) {
  if (n < 0.01) return `$${(n * 1000).toFixed(3)}m`;
  return `$${n.toFixed(4)}`;
}

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

const TOOL_ICONS: Record<string, string> = {
  get_quote:          '📈',
  get_news:           '📰',
  get_market_context: '🌐',
};

interface Props {
  data: ObsData;
}

export function ObservabilityPanel({ data }: Props) {
  const [toolsOpen, setToolsOpen] = useState(true);

  const estimatedCost =
    (data.inputTokens * PRICE_INPUT + data.outputTokens * PRICE_OUTPUT) / 1_000_000;

  return (
    <aside className="w-64 shrink-0 border-l border-[#1f2937] bg-[#080d12] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1f2937] flex items-center gap-2">
        <Activity size={13} className="text-emerald-400" />
        <span className="text-xs font-mono font-bold text-gray-300 uppercase tracking-widest">
          Observability
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 font-mono text-xs">

        {/* Session stats */}
        <div className="space-y-2">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">Session</p>
          <div className="grid grid-cols-2 gap-2">
            <Stat icon={<Zap size={11} />} label="Requests" value={String(data.requests)} color="text-blue-400" />
            <Stat
              icon={<Clock size={11} />}
              label="Latency"
              value={data.lastLatencyMs ? `${(data.lastLatencyMs / 1000).toFixed(1)}s` : '—'}
              color="text-amber-400"
            />
            <Stat
              icon={<Activity size={11} />}
              label="Tokens"
              value={fmt(data.inputTokens + data.outputTokens)}
              color="text-emerald-400"
            />
            <Stat
              icon={<DollarSign size={11} />}
              label="Est. Cost"
              value={data.requests > 0 ? usd(estimatedCost) : '—'}
              color="text-purple-400"
            />
          </div>
        </div>

        {/* Token breakdown */}
        {data.requests > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest">Token Breakdown</p>
            <TokenBar label="Input" tokens={data.inputTokens} total={data.inputTokens + data.outputTokens} color="bg-blue-500" />
            <TokenBar label="Output" tokens={data.outputTokens} total={data.inputTokens + data.outputTokens} color="bg-emerald-500" />
          </div>
        )}

        {/* Tool calls log */}
        <div>
          <button
            onClick={() => setToolsOpen((o) => !o)}
            className="flex items-center gap-1.5 text-[10px] text-gray-600 uppercase tracking-widest w-full hover:text-gray-400 transition-colors"
          >
            {toolsOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            Tool Calls ({data.toolCalls.length})
          </button>

          {toolsOpen && (
            <div className="mt-2 space-y-1.5">
              {data.toolCalls.length === 0 ? (
                <p className="text-gray-700 italic text-[11px]">No tool calls yet</p>
              ) : (
                [...data.toolCalls].reverse().map((tc) => (
                  <div
                    key={tc.id}
                    className="rounded bg-[#0d1117] border border-[#1f2937] px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{TOOL_ICONS[tc.name] ?? '🔧'}</span>
                      <span className={tc.success ? 'text-emerald-400' : 'text-red-400'}>
                        {tc.name.replace('get_', '')}
                      </span>
                      {tc.durationMs && (
                        <span className="ml-auto text-gray-600">{tc.durationMs}ms</span>
                      )}
                    </div>
                    <p className="text-gray-600 text-[10px] truncate mt-0.5">
                      {Object.values(tc.args)
                        .filter((v) => typeof v === 'string' || typeof v === 'number')
                        .join(', ') || '{}'}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Model info */}
        <div className="pt-2 border-t border-[#1f2937] space-y-1 text-[10px] text-gray-600">
          <p>Model: <span className="text-gray-500">claude-sonnet-4-6</span></p>
          <p>Tools: <span className="text-gray-500">3 registered</span></p>
          <p>Transport: <span className="text-gray-500">HTTP · MCP 2024-11-05</span></p>
        </div>
      </div>
    </aside>
  );
}

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded bg-[#0d1117] border border-[#1f2937] px-2.5 py-2">
      <div className={`flex items-center gap-1 ${color} mb-0.5`}>
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-white font-semibold">{value}</p>
    </div>
  );
}

function TokenBar({
  label,
  tokens,
  total,
  color,
}: {
  label: string;
  tokens: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((tokens / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[10px] text-gray-600 mb-0.5">
        <span>{label}</span>
        <span>{fmt(tokens)} ({pct}%)</span>
      </div>
      <div className="h-1 rounded bg-[#1f2937] overflow-hidden">
        <div className={`h-full ${color} opacity-70 rounded`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
