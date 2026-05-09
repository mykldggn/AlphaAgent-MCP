import _yahooFinance from 'yahoo-finance2';
// Type cast required: yahoo-finance2 v2.14 ESM types this as constructor, not instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yf = _yahooFinance as any;

// Crypto shorthand → Yahoo Finance symbol
const CRYPTO_MAP: Record<string, string> = {
  BTC: 'BTC-USD', BITCOIN: 'BTC-USD',
  ETH: 'ETH-USD', ETHEREUM: 'ETH-USD',
  SOL: 'SOL-USD', SOLANA: 'SOL-USD',
  DOGE: 'DOGE-USD',
  XRP: 'XRP-USD', RIPPLE: 'XRP-USD',
  ADA: 'ADA-USD', CARDANO: 'ADA-USD',
  AVAX: 'AVAX-USD', AVALANCHE: 'AVAX-USD',
  LINK: 'LINK-USD', CHAINLINK: 'LINK-USD',
  DOT: 'DOT-USD', POLKADOT: 'DOT-USD',
  MATIC: 'MATIC-USD', POLYGON: 'MATIC-USD',
};

function normalizeTicker(input: string): string {
  const upper = input.toUpperCase().trim();
  return CRYPTO_MAP[upper] ?? upper;
}

export interface QuoteResult {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  currency: string;
  exchange?: string;
  assetType: string;
  marketState?: string;
}

export async function getQuote(ticker: string): Promise<QuoteResult> {
  const symbol = normalizeTicker(ticker);
  const q = await yf.quote(symbol);

  return {
    ticker: q.symbol ?? symbol,
    name: q.shortName ?? q.longName ?? ticker,
    price: q.regularMarketPrice ?? 0,
    change: q.regularMarketChange ?? 0,
    changePercent: q.regularMarketChangePercent ?? 0,
    volume: q.regularMarketVolume ?? 0,
    marketCap: q.marketCap,
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: q.fiftyTwoWeekLow,
    currency: q.currency ?? 'USD',
    exchange: q.fullExchangeName,
    assetType: q.quoteType ?? 'EQUITY',
    marketState: q.marketState,
  };
}

export interface NewsItem {
  title: string;
  publisher: string;
  publishedAt: string | null;
  link: string;
}

export async function getNews(query: string, limit = 6): Promise<NewsItem[]> {
  const results = await yf.search(query, {
    newsCount: limit,
    quotesCount: 0,
    enableFuzzyQuery: false,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (results.news ?? []).map((n: any) => ({
    title: n.title,
    publisher: n.publisher,
    publishedAt: n.providerPublishTime
      ? new Date((n.providerPublishTime as number) * 1000).toISOString()
      : null,
    link: n.link,
  }));
}

export interface MarketContext {
  sp500: { price: number; changePercent: number; trend: 'up' | 'down' } | null;
  vix: { price: number; fearLevel: string };
  gold: { price: number; changePercent: number } | null;
  dollarIndex: { price: number; changePercent: number } | null;
  timestamp: string;
  summary: string;
}

export async function getMarketContext(): Promise<MarketContext> {
  const [sp500, vix, gold, dxy] = await Promise.allSettled([
    yf.quote('^GSPC'),
    yf.quote('^VIX'),
    yf.quote('GC=F'),
    yf.quote('DX-Y.NYB'),
  ]);

  const ok = <T>(r: PromiseSettledResult<T>) =>
    r.status === 'fulfilled' ? r.value : null;

  const s = ok(sp500);
  const v = ok(vix);
  const g = ok(gold);
  const d = ok(dxy);

  const vixPrice = (v as any)?.regularMarketPrice ?? 0;
  const fearLevel =
    vixPrice > 30 ? 'extreme_fear (VIX>30)' :
    vixPrice > 20 ? 'elevated_fear (VIX>20)' :
    vixPrice > 15 ? 'moderate (VIX 15-20)' : 'low_volatility (VIX<15)';

  const spChange = (s as any)?.regularMarketChangePercent ?? 0;
  const macro = spChange > 0.5 ? 'broadly bullish' : spChange < -0.5 ? 'broadly bearish' : 'mixed/neutral';

  return {
    sp500: s ? {
      price: (s as any).regularMarketPrice,
      changePercent: spChange,
      trend: spChange >= 0 ? 'up' : 'down',
    } : null,
    vix: { price: vixPrice, fearLevel },
    gold: g ? {
      price: (g as any).regularMarketPrice,
      changePercent: (g as any).regularMarketChangePercent,
    } : null,
    dollarIndex: d ? {
      price: (d as any).regularMarketPrice,
      changePercent: (d as any).regularMarketChangePercent,
    } : null,
    timestamp: new Date().toISOString(),
    summary: `Macro environment is ${macro}. Volatility is ${fearLevel}.`,
  };
}
