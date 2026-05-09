/**
 * Data sources:
 *   Stocks / Indices  → Finnhub REST API  (60 calls/min free, FINNHUB_API_KEY)
 *   Crypto            → CoinGecko API     (50 calls/min free, no key required)
 */

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

async function finnhub<T = unknown>(path: string): Promise<T> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error('FINNHUB_API_KEY is not set');
  const url = `${FINNHUB_BASE}${path}${path.includes('?') ? '&' : '?'}token=${key}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Finnhub ${res.status} ${res.statusText} — ${path}`);
  return res.json() as Promise<T>;
}

async function coingecko<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`https://api.coingecko.com/api/v3${path}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`CoinGecko ${res.status} — ${path}`);
  return res.json() as Promise<T>;
}

// ── Crypto routing ─────────────────────────────────────────────────────────────

const CRYPTO_TO_CG: Record<string, string> = {
  BTC: 'bitcoin',     BITCOIN: 'bitcoin',
  ETH: 'ethereum',    ETHEREUM: 'ethereum',
  SOL: 'solana',      SOLANA: 'solana',
  DOGE: 'dogecoin',
  XRP: 'ripple',      RIPPLE: 'ripple',
  ADA: 'cardano',     CARDANO: 'cardano',
  AVAX: 'avalanche-2', AVALANCHE: 'avalanche-2',
  LINK: 'chainlink',  CHAINLINK: 'chainlink',
  DOT: 'polkadot',    POLKADOT: 'polkadot',
  MATIC: 'matic-network', POLYGON: 'matic-network',
  LTC: 'litecoin',
  UNI: 'uniswap',
  ATOM: 'cosmos',
};

function getCoinGeckoId(input: string): string | null {
  return CRYPTO_TO_CG[input.toUpperCase().trim()] ?? null;
}

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface QuoteResult {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  high?: number;
  low?: number;
  prevClose?: number;
  currency: string;
  exchange?: string;
  assetType: string;
}

export interface NewsItem {
  title: string;
  publisher: string;
  publishedAt: string | null;
  link: string;
  summary?: string;
}

export interface MarketContext {
  sp500: { price: number; changePercent: number; trend: 'up' | 'down' } | null;
  nasdaq: { price: number; changePercent: number } | null;
  gold: { price: number; changePercent: number } | null;
  fearGreed: string;
  timestamp: string;
  summary: string;
}

// ── get_quote ──────────────────────────────────────────────────────────────────

export async function getQuote(ticker: string): Promise<QuoteResult> {
  const upper = ticker.toUpperCase().trim();
  const cgId = getCoinGeckoId(upper);

  if (cgId) return getCryptoQuote(upper, cgId);
  return getStockQuote(upper);
}

async function getCryptoQuote(ticker: string, cgId: string): Promise<QuoteResult> {
  type CgPrice = Record<string, {
    usd: number;
    usd_24h_change: number;
    usd_24h_vol: number;
    usd_market_cap: number;
  }>;

  const data = await coingecko<CgPrice>(
    `/simple/price?ids=${cgId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
  );
  const coin = data[cgId];
  if (!coin || !coin.usd) throw new Error(`No CoinGecko data for ${cgId}`);

  return {
    ticker,
    name: cgId.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    price: coin.usd,
    change: 0,
    changePercent: coin.usd_24h_change ?? 0,
    volume: coin.usd_24h_vol ?? 0,
    marketCap: coin.usd_market_cap,
    currency: 'USD',
    assetType: 'CRYPTOCURRENCY',
  };
}

async function getStockQuote(symbol: string): Promise<QuoteResult> {
  type FhQuote = { c: number; d: number; dp: number; h: number; l: number; pc: number; v?: number };
  type FhProfile = { name?: string; currency?: string; exchange?: string };

  const [quoteRes, profileRes] = await Promise.allSettled([
    finnhub<FhQuote>(`/quote?symbol=${symbol}`),
    finnhub<FhProfile>(`/stock/profile2?symbol=${symbol}`),
  ]);

  if (quoteRes.status === 'rejected') throw quoteRes.reason;
  const q = quoteRes.value;
  if (!q.c) throw new Error(`No price data returned for ${symbol} — check the ticker`);

  const profile = profileRes.status === 'fulfilled' ? profileRes.value : {};

  return {
    ticker: symbol,
    name: (profile as FhProfile).name ?? symbol,
    price: q.c,
    change: q.d ?? 0,
    changePercent: q.dp ?? 0,
    volume: q.v ?? 0,
    high: q.h,
    low: q.l,
    prevClose: q.pc,
    currency: (profile as FhProfile).currency ?? 'USD',
    exchange: (profile as FhProfile).exchange,
    assetType: 'EQUITY',
  };
}

// ── get_news ───────────────────────────────────────────────────────────────────

export async function getNews(query: string, limit = 6): Promise<NewsItem[]> {
  const upper = query.toUpperCase().trim();
  const isCrypto = !!getCoinGeckoId(upper);

  // For crypto: CoinGecko news search; for stocks: Finnhub company news
  if (!isCrypto) {
    // Try Finnhub company news (last 7 days)
    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - 7 * 86400_000).toISOString().split('T')[0];

    type FhNews = { headline: string; source: string; datetime: number; url: string; summary?: string }[];

    try {
      const items = await finnhub<FhNews>(
        `/company-news?symbol=${upper}&from=${from}&to=${to}`
      );
      if (items.length > 0) {
        return items.slice(0, limit).map((n) => ({
          title: n.headline,
          publisher: n.source,
          publishedAt: new Date(n.datetime * 1000).toISOString(),
          link: n.url,
          summary: n.summary,
        }));
      }
    } catch { /* fall through to general news */ }

    // Fallback: general market news
    const general = await finnhub<FhNews>('/news?category=general');
    return general.slice(0, limit).map((n) => ({
      title: n.headline,
      publisher: n.source,
      publishedAt: new Date(n.datetime * 1000).toISOString(),
      link: n.url,
      summary: n.summary,
    }));
  }

  // Crypto: use CoinGecko's search + trending as a proxy for news context
  type CgSearch = { coins: { id: string; name: string; symbol: string }[] };
  const cgId = getCoinGeckoId(upper) ?? upper.toLowerCase();

  // Return trending context since CoinGecko free doesn't have news
  const trending = await coingecko<{ coins: { item: { name: string; symbol: string; data?: { price_change_percentage_24h?: { usd?: number }; sparkline?: string } } }[] }>('/search/trending');
  const items = trending.coins.slice(0, limit).map((c) => ({
    title: `${c.item.name} (${c.item.symbol.toUpperCase()}) is trending on CoinGecko`,
    publisher: 'CoinGecko Trending',
    publishedAt: new Date().toISOString(),
    link: `https://www.coingecko.com/en/coins/${c.item.name.toLowerCase().replace(/\s+/g, '-')}`,
  }));

  // Also try general market news from Finnhub for crypto context
  try {
    type FhNews = { headline: string; source: string; datetime: number; url: string }[];
    const cryptoNews = await finnhub<FhNews>('/news?category=crypto');
    return cryptoNews.slice(0, limit).map((n) => ({
      title: n.headline,
      publisher: n.source,
      publishedAt: new Date(n.datetime * 1000).toISOString(),
      link: n.url,
    }));
  } catch {
    return items;
  }
}

// ── get_market_context ─────────────────────────────────────────────────────────

export async function getMarketContext(): Promise<MarketContext> {
  type FhQuote = { c: number; d: number; dp: number };

  // SPY = S&P 500 ETF, QQQ = Nasdaq ETF, GLD = Gold ETF
  const [spy, qqq, gld] = await Promise.allSettled([
    finnhub<FhQuote>('/quote?symbol=SPY'),
    finnhub<FhQuote>('/quote?symbol=QQQ'),
    finnhub<FhQuote>('/quote?symbol=GLD'),
  ]);

  const ok = <T>(r: PromiseSettledResult<T>) => (r.status === 'fulfilled' ? r.value : null);
  const s = ok(spy);
  const q = ok(qqq);
  const g = ok(gld);

  const spChange = s?.dp ?? 0;
  const macro =
    spChange > 1   ? 'strongly bullish' :
    spChange > 0.3 ? 'broadly bullish' :
    spChange < -1  ? 'strongly bearish' :
    spChange < -0.3 ? 'broadly bearish' : 'mixed/neutral';

  // Approximate fear/greed from SPY + QQQ momentum
  const avgChange = ((s?.dp ?? 0) + (q?.dp ?? 0)) / 2;
  const fearGreed =
    avgChange > 1.5 ? 'greed' :
    avgChange > 0.3 ? 'mild_optimism' :
    avgChange < -1.5 ? 'fear' :
    avgChange < -0.3 ? 'mild_caution' : 'neutral';

  return {
    sp500: s ? { price: s.c, changePercent: s.dp, trend: s.dp >= 0 ? 'up' : 'down' } : null,
    nasdaq: q ? { price: q.c, changePercent: q.dp } : null,
    gold: g ? { price: g.c, changePercent: g.dp } : null,
    fearGreed,
    timestamp: new Date().toISOString(),
    summary: `Market is ${macro}. Sentiment: ${fearGreed}. Gold ${g ? (g.dp >= 0 ? 'up' : 'down') : 'n/a'} ${g ? Math.abs(g.dp).toFixed(2) : ''}%.`,
  };
}
