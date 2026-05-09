'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { ToolInvocation } from 'ai';

const TOOL_META: Record<string, { label: string; icon: string; color: string }> = {
  get_quote:          { label: 'Live Quote',       icon: '📈', color: 'text-emerald-400' },
  get_news:           { label: 'News Feed',         icon: '📰', color: 'text-blue-400'   },
  get_market_context: { label: 'Macro Context',    icon: '🌐', color: 'text-amber-400'  },
};

interface Props {
  invocation: ToolInvocation;
}

export function ToolCallCard({ invocation }: Props) {
  const [open, setOpen] = useState(false);
  const meta = TOOL_META[invocation.toolName] ?? {
    label: invocation.toolName,
    icon: '🔧',
    color: 'text-gray-400',
  };

  const isPending = invocation.state === 'call';
  const isError =
    invocation.state === 'result' &&
    typeof invocation.result === 'object' &&
    invocation.result !== null &&
    'error' in invocation.result;

  return (
    <div className="my-1.5 rounded border border-[#1f2937] bg-[#0d1117] overflow-hidden text-xs font-mono">
      {/* Header row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#161b22] transition-colors text-left"
      >
        {/* Status icon */}
        {isPending ? (
          <Loader2 size={12} className="animate-spin text-amber-400 shrink-0" />
        ) : isError ? (
          <XCircle size={12} className="text-red-400 shrink-0" />
        ) : (
          <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
        )}

        {/* Tool identity */}
        <span className="text-base leading-none">{meta.icon}</span>
        <span className={`font-semibold ${meta.color}`}>{meta.label}</span>

        {/* Args preview */}
        <span className="text-gray-500 truncate flex-1">
          {Object.values(invocation.args ?? {})
            .filter((v) => typeof v === 'string' || typeof v === 'number')
            .join(', ')}
        </span>

        {/* Expand chevron */}
        {open ? (
          <ChevronDown size={12} className="text-gray-600 shrink-0" />
        ) : (
          <ChevronRight size={12} className="text-gray-600 shrink-0" />
        )}
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-[#1f2937] px-3 py-2 space-y-2">
          <div>
            <p className="text-gray-500 uppercase tracking-wider text-[10px] mb-1">Input</p>
            <pre className="text-gray-300 whitespace-pre-wrap break-all leading-relaxed">
              {JSON.stringify(invocation.args, null, 2)}
            </pre>
          </div>
          {invocation.state === 'result' && (
            <div>
              <p className="text-gray-500 uppercase tracking-wider text-[10px] mb-1">Result</p>
              <pre className="text-gray-300 whitespace-pre-wrap break-all leading-relaxed max-h-48 overflow-y-auto">
                {JSON.stringify(invocation.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
