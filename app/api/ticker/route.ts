import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export interface Tick {
  symbol: string;
  label: string;
  price: number;
  changePercent: number;
}

export async function GET() {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return NextResponse.json({ error: 'No API key' }, { status: 500 });

  const fh = (symbol: string) =>
    fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${key}`, {
      next: { revalidate: 0 },
    }).then((r) => r.json());

  const [spy, gld, btcRaw] = await Promise.all([
    fh('SPY'),
    fh('GLD'),
    fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
      { next: { revalidate: 0 } }
    ).then((r) => r.json()),
  ]);

  const ticks: Tick[] = [
    { symbol: 'SPY',  label: 'S&P 500',  price: spy.c,             changePercent: spy.dp },
    { symbol: 'BTC',  label: 'Bitcoin',  price: btcRaw.bitcoin.usd, changePercent: btcRaw.bitcoin.usd_24h_change },
    { symbol: 'GLD',  label: 'Gold',     price: gld.c,             changePercent: gld.dp },
  ];

  return NextResponse.json(ticks);
}
