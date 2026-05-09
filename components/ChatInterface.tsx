'use client';

import { useChat } from 'ai/react';
import { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Message } from './Message';
import { SignalPanel, type SignalEntry, type SignalType, type ActivityEntry } from './SignalPanel';

const SUGGESTIONS = [
  { label: 'Analyze NVDA',    query: 'Analyze Nvidia (NVDA) — should I buy now?' },
  { label: 'Bitcoin outlook', query: 'What is Bitcoin doing? Is this a good entry point?' },
  { label: 'Market overview', query: 'Give me a macro market overview for today.' },
  { label: 'AAPL vs MSFT',   query: 'Compare Apple and Microsoft — which is the better buy right now?' },
];

const SIGNAL_RE = /\*\*(STRONG BUY|BUY|HOLD|SELL|STRONG SELL)\*\*.*?Confidence:\s*(\d+)%/i;
const TICKER_RE = /###\s+([A-Z0-9.\-]+)\s+[—–]/;

function extractSignal(content: string): { signal: SignalType; confidence: number; ticker: string } | null {
  const sm = content.match(SIGNAL_RE);
  if (!sm) return null;
  const tm = content.match(TICKER_RE);
  return {
    signal: sm[1].toUpperCase() as SignalType,
    confidence: parseInt(sm[2], 10),
    ticker: tm?.[1] ?? '—',
  };
}

function toolActivity(name: string, args: Record<string, unknown>): { icon: string; text: string } {
  switch (name) {
    case 'get_quote':
      return { icon: '📈', text: `Fetched live quote — ${String(args.ticker ?? '').toUpperCase()}` };
    case 'get_news':
      return { icon: '📰', text: `Pulled headlines — ${String(args.query ?? '')}` };
    case 'get_market_context':
      return { icon: '🌐', text: 'Checked macro conditions (SPY · QQQ · GLD)' };
    default:
      return { icon: '🔧', text: name };
  }
}

let activityCounter = 0;
const uid = () => `act-${++activityCounter}-${Date.now()}`;

export function ChatInterface() {
  const [signals, setSignals] = useState<SignalEntry[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } = useChat({
    api: '/api/chat',
    onFinish: (message) => {
      const content = typeof message.content === 'string' ? message.content : '';
      const toolEntries: ActivityEntry[] = (message.toolInvocations ?? []).map((inv) => {
        const { icon, text } = toolActivity(inv.toolName, inv.args as Record<string, unknown>);
        return { id: uid(), icon, text, timestamp: new Date() };
      });
      const parsed = extractSignal(content);
      if (parsed) {
        toolEntries.push({ id: uid(), icon: '✦', text: `Signal — ${parsed.ticker} ${parsed.signal} (${parsed.confidence}%)`, timestamp: new Date() });
        setSignals((prev) => [...prev, { id: uid(), ticker: parsed.ticker, signal: parsed.signal, confidence: parsed.confidence, timestamp: new Date() }]);
      }
      if (toolEntries.length > 0) setActivity((prev) => [...prev, ...toolEntries].slice(-40));
    },
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const submitSuggestion = useCallback((query: string) => {
    setInput(query);
    setTimeout(() => { (document.getElementById('chat-form') as HTMLFormElement | null)?.requestSubmit(); }, 50);
  }, [setInput]);

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {messages.length === 0 ? <Welcome onSuggestion={submitSuggestion} /> : messages.map((m) => <Message key={m.id} message={m} />)}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3">
              <div className="shrink-0 w-6 h-6 rounded bg-emerald-900/40 border border-emerald-700/40 flex items-center justify-center text-[10px] font-bold text-emerald-400 font-mono">AA</div>
              <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                <Loader2 size={12} className="animate-spin" />
                <span className="font-mono text-xs">Fetching data...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-[#1f2937] bg-[#080d12] px-4 py-3">
          <form id="chat-form" onSubmit={handleSubmit} className="flex items-center gap-3 rounded-lg border border-[#2d3748] bg-[#0d1117] px-4 py-2.5 focus-within:border-emerald-700/60 transition-colors">
            <span className="text-emerald-500 font-mono text-sm shrink-0">$</span>
            <input value={input} onChange={handleInputChange} placeholder="Ask about a stock, crypto, or market condition..." className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none font-mono" disabled={isLoading} />
            <button type="submit" disabled={isLoading || !input.trim()} className="shrink-0 flex items-center justify-center w-7 h-7 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              {isLoading ? <Loader2 size={13} className="animate-spin text-white" /> : <Send size={13} className="text-white" />}
            </button>
          </form>
          <p className="mt-1.5 text-[10px] text-gray-700 font-mono text-center">Claude claude-sonnet-4-6 · Stocks: Finnhub · Crypto: CoinGecko · MCP 2024-11-05</p>
        </div>
      </div>
      <SignalPanel signals={signals} activity={activity} />
    </div>
  );
}

function Welcome({ onSuggestion }: { onSuggestion: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 gap-8">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-2xl font-bold text-white tracking-tight">ALPHAAGENT MCP</span>
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <p className="text-gray-500 text-sm font-mono">AI-powered financial intelligence · Live market data · Multi-step agent reasoning</p>
        <p className="text-gray-700 text-xs font-mono">Stocks: Finnhub · Crypto: CoinGecko · Macro: SPY / QQQ / GLD</p>
      </div>
      <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
        {SUGGESTIONS.map((s) => (
          <button key={s.label} onClick={() => onSuggestion(s.query)} className="text-left rounded border border-[#1f2937] bg-[#0d1117] hover:border-emerald-700/50 hover:bg-[#0d1f17] px-4 py-3 transition-all group">
            <p className="text-xs font-mono font-semibold text-gray-300 group-hover:text-emerald-400 transition-colors">{s.label}</p>
            <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">{s.query}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
