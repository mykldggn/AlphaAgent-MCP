/**
 * FinAgent MCP Server — HTTP/JSON-RPC transport
 *
 * Exposes the same financial tools via the Model Context Protocol over HTTP,
 * making them callable from any MCP-compatible client (Claude Desktop, agents, etc.)
 *
 * Protocol: MCP 2024-11-05  |  Transport: HTTP POST (stateless JSON-RPC)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getQuote, getNews, getMarketContext } from '@/lib/tools';

export const runtime = 'nodejs';

const MCP_VERSION = '2024-11-05';

const TOOLS = [
  {
    name: 'get_quote',
    description: 'Fetch real-time price quote for a stock or cryptocurrency.',
    inputSchema: {
      type: 'object',
      properties: {
        ticker: {
          type: 'string',
          description: 'Stock ticker (AAPL, NVDA) or crypto symbol (BTC, ETH, SOL)',
        },
      },
      required: ['ticker'],
    },
  },
  {
    name: 'get_news',
    description: 'Fetch recent news headlines for a stock, crypto, or market topic.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query — ticker, company name, or topic',
        },
        limit: {
          type: 'number',
          description: 'Number of articles to return (1–10, default 6)',
          default: 6,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_market_context',
    description:
      'Get current macro market conditions: S&P 500, VIX fear index, Gold, Dollar index.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

type JsonRpcRequest = {
  jsonrpc: string;
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
};

function ok(id: string | number, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result });
}

function err(id: string | number, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } });
}

export async function POST(req: NextRequest) {
  let body: JsonRpcRequest;

  try {
    body = await req.json();
  } catch {
    return err(0, -32700, 'Parse error');
  }

  const { jsonrpc, id, method, params } = body;

  if (jsonrpc !== '2.0') return err(id, -32600, 'Invalid Request — must be JSON-RPC 2.0');

  try {
    // ── Handshake ──────────────────────────────────────────────
    if (method === 'initialize') {
      return ok(id, {
        protocolVersion: MCP_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'fin-agent', version: '1.0.0' },
        instructions:
          'Real-time financial data tools: stock/crypto quotes, news, and macro market context.',
      });
    }

    if (method === 'notifications/initialized') {
      return new NextResponse(null, { status: 204 });
    }

    // ── Tool discovery ─────────────────────────────────────────
    if (method === 'tools/list') {
      return ok(id, { tools: TOOLS });
    }

    // ── Tool execution ─────────────────────────────────────────
    if (method === 'tools/call') {
      const { name, arguments: args = {} } = (params ?? {}) as {
        name: string;
        arguments?: Record<string, unknown>;
      };

      let data: unknown;

      if (name === 'get_quote') {
        data = await getQuote(args.ticker as string);
      } else if (name === 'get_news') {
        data = await getNews(args.query as string, (args.limit as number) ?? 6);
      } else if (name === 'get_market_context') {
        data = await getMarketContext();
      } else {
        return err(id, -32601, `Unknown tool: ${name}`);
      }

      return ok(id, {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        isError: false,
      });
    }

    return err(id, -32601, `Method not found: ${method}`);
  } catch (e) {
    console.error('[FinAgent MCP]', e);
    return err(id, -32000, (e as Error).message ?? 'Internal server error');
  }
}

// Allow MCP clients to discover the endpoint
export async function GET() {
  return NextResponse.json({
    name: 'fin-agent',
    version: '1.0.0',
    protocol: MCP_VERSION,
    tools: TOOLS.map((t) => t.name),
  });
}
