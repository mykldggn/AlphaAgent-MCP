import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { getQuote, getNews, getMarketContext } from '@/lib/tools';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are FinAgent, an AI-powered financial intelligence terminal. You give sharp, data-driven analysis on stocks and crypto using live market data.

## Workflow for asset analysis requests:
1. Call get_quote to fetch the live price, change, and 52-week range
2. Call get_news to pull recent headlines — these are the narrative catalysts
3. Call get_market_context to assess the macro backdrop (S&P 500 direction, VIX fear level, Gold, Dollar)
4. Synthesize everything into a structured analysis

## Output format for a full analysis:
### [TICKER] — [Company/Asset Name]
**Price:** $X.XX ([+/-]X.XX, [+/-]X.XX%)

#### Price Action
[1-2 sentences on technicals: where is it relative to 52-week range, momentum]

#### News Drivers
[2-3 key headlines with brief interpretation — what do they mean for the stock?]

#### Macro Context
[1-2 sentences on whether the macro environment (VIX, S&P, dollar) is a tailwind or headwind]

#### Geopolitical & Sector Risks
[Any relevant geopolitical, regulatory, or sector-specific risks from the news]

#### Signal
**[STRONG BUY / BUY / HOLD / SELL / STRONG SELL]** — Confidence: [X]%
[2-3 sentence thesis: why this rating, what's the key risk to the thesis]

## Rating framework:
- STRONG BUY: Multiple positive catalysts, oversold/fair valuation, supportive macro, high conviction
- BUY: Positive outlook with manageable uncertainty
- HOLD: Mixed signals, risk/reward neutral, no clear catalyst
- SELL: Negative catalysts, overvalued, or macro headwinds
- STRONG SELL: High conviction downside, significant near-term risks

## Rules:
- Always use real data you fetched — never fabricate prices or metrics
- Keep the analysis sharp and actionable, not verbose
- For general market questions (no specific ticker), use get_market_context + get_news for context
- Confidence % reflects how clear the signal is given available data, not certainty of outcome`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: SYSTEM_PROMPT,
    messages,
    maxSteps: 8,
    tools: {
      get_quote: tool({
        description:
          'Fetch real-time price quote for a stock or cryptocurrency. Call this first for any specific asset.',
        parameters: z.object({
          ticker: z
            .string()
            .describe(
              'Stock ticker (AAPL, NVDA, TSLA) or crypto name/ticker (BTC, ETH, SOL, bitcoin)'
            ),
        }),
        execute: async ({ ticker }) => {
          try {
            return await getQuote(ticker);
          } catch (e) {
            return { error: `Could not fetch quote for "${ticker}": ${(e as Error).message}` };
          }
        },
      }),

      get_news: tool({
        description:
          'Fetch recent news headlines for a stock, crypto, or market topic. Use this to surface narrative catalysts and sentiment drivers.',
        parameters: z.object({
          query: z
            .string()
            .describe(
              'Search query — company name, ticker, or topic (e.g. "Apple earnings", "Fed rate decision", "Bitcoin ETF")'
            ),
          limit: z
            .number()
            .min(1)
            .max(10)
            .default(6)
            .describe('Number of articles to return (default 6)'),
        }),
        execute: async ({ query, limit }) => {
          try {
            return await getNews(query, limit);
          } catch (e) {
            return { error: `Could not fetch news for "${query}": ${(e as Error).message}` };
          }
        },
      }),

      get_market_context: tool({
        description:
          'Get current macro market conditions: S&P 500 direction, VIX fear index, Gold, and Dollar index. Use this to assess whether the broad market environment supports or pressures the trade.',
        parameters: z.object({}),
        execute: async () => {
          try {
            return await getMarketContext();
          } catch (e) {
            return { error: `Could not fetch market context: ${(e as Error).message}` };
          }
        },
      }),
    },
    onFinish({ usage, finishReason }) {
      console.log('[FinAgent chat]', {
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        finishReason,
        ts: new Date().toISOString(),
      });
    },
  });

  return result.toDataStreamResponse({ sendUsage: true });
}
