import { ChatInterface } from '@/components/ChatInterface';

export default function Home() {
  return (
    <main className="h-screen flex flex-col relative">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-[#1f2937] bg-[#080d12]">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow" />
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="w-2 h-2 rounded-full bg-emerald-800" />
          </div>
          <span className="font-mono text-sm font-bold text-white tracking-widest">ALPHAAGENT MCP</span>
          <span className="hidden sm:inline text-[11px] text-gray-600 font-mono border border-[#1f2937] rounded px-2 py-0.5">
            claude-sonnet-4-6
          </span>
          <span className="hidden sm:inline text-[11px] text-gray-600 font-mono border border-[#1f2937] rounded px-2 py-0.5">
            MCP 2024-11-05
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-mono text-gray-600">
          <span className="hidden md:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-emerald-500">LIVE DATA</span>
          </span>
          <span className="hidden md:block">Finnhub · CoinGecko · 3 Tools</span>
        </div>
      </header>

      {/* Chat */}
      <ChatInterface />
    </main>
  );
}
