#!/usr/bin/env tsx
/**
 * AlphaAgent MCP Server — stdio transport
 *
 * Exposes financial data tools via the Model Context Protocol.
 * Works with Claude Desktop, Cursor, and any stdio-compatible MCP client.
 *
 * Usage:
 *   npm run mcp
 *
 * Claude Desktop config (~/.claude/claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "alpha-agent-mcp": {
 *         "command": "tsx",
 *         "args": ["/path/to/AlphaAgentMCP/mcp-server/index.ts"]
 *       }
 *     }
 *   }
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getQuote, getNews, getMarketContext } from '../lib/tools.js';

const server = new McpServer({
  name: 'fin-agent',
  version: '1.0.0',
});

// ── Tool: get_quote ────────────────────────────────────────────────────────────
server.tool(
  'get_quote',
  'Fetch real-time price, change %, volume, and 52-week range for a stock or cryptocurrency.',
  {
    ticker: z
      .string()
      .describe('Stock ticker (AAPL, NVDA, TSLA) or crypto symbol/name (BTC, ETH, SOL, bitcoin)'),
  },
  async ({ ticker }) => {
    const data = await getQuote(ticker);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Tool: get_news ─────────────────────────────────────────────────────────────
server.tool(
  'get_news',
  'Fetch recent news headlines and links for a stock, cryptocurrency, or market topic.',
  {
    query: z
      .string()
      .describe('Search query — ticker, company name, or topic (e.g. "Fed rate decision")'),
    limit: z
      .number()
      .min(1)
      .max(10)
      .default(6)
      .describe('Number of articles to return (default 6)'),
  },
  async ({ query, limit }) => {
    const data = await getNews(query, limit);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Tool: get_market_context ───────────────────────────────────────────────────
server.tool(
  'get_market_context',
  'Get current macro market conditions: S&P 500 direction, VIX fear index, Gold price, and Dollar index. Use to assess the broad market environment.',
  {},
  async () => {
    const data = await getMarketContext();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Connect ────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);

process.stderr.write('[AlphaAgent MCP] Server running on stdio — ready for connections\n');
