'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ToolCallCard } from './ToolCallCard';
import type { Message as AIMessage } from 'ai';

interface Props {
  message: AIMessage;
}

export function Message({ message }: Props) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg bg-[#1d3461] border border-blue-900/50 px-4 py-2.5 text-sm text-gray-100">
          {message.content as string}
        </div>
      </div>
    );
  }

  // Assistant message — render parts in order (text + tool calls interleaved)
  return (
    <div className="flex gap-3 max-w-[90%]">
      {/* Avatar */}
      <div className="shrink-0 mt-0.5 w-6 h-6 rounded bg-emerald-900/40 border border-emerald-700/40 flex items-center justify-center text-[10px] font-bold text-emerald-400 font-mono">
        FA
      </div>

      <div className="flex-1 min-w-0">
        {/* Render content parts: text and tool invocations in document order */}
        {message.parts ? (
          message.parts.map((part, i) => {
            if (part.type === 'text') {
              return (
                <MarkdownContent key={i} content={part.text} />
              );
            }
            if (part.type === 'tool-invocation') {
              return (
                <ToolCallCard key={i} invocation={part.toolInvocation} />
              );
            }
            return null;
          })
        ) : (
          // Fallback for messages without parts
          <MarkdownContent content={message.content as string} />
        )}
      </div>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  if (!content) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h3: ({ children }) => (
          <h3 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mt-4 mb-1.5 first:mt-0">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-amber-400 text-sm font-semibold mt-3 mb-1">{children}</h4>
        ),
        p: ({ children }) => (
          <p className="text-gray-300 text-sm leading-relaxed mb-2">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="text-white font-semibold">{children}</strong>
        ),
        em: ({ children }) => <em className="text-gray-400 not-italic">{children}</em>,
        ul: ({ children }) => <ul className="my-1.5 space-y-0.5">{children}</ul>,
        li: ({ children }) => (
          <li className="flex gap-2 text-sm text-gray-300">
            <span className="text-blue-500 shrink-0 mt-0.5">▸</span>
            <span>{children}</span>
          </li>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-');
          if (isBlock) {
            return (
              <pre className="my-2 rounded bg-[#0d1117] border border-[#1f2937] px-3 py-2 overflow-x-auto">
                <code className="text-xs text-emerald-300 font-mono">{children}</code>
              </pre>
            );
          }
          return (
            <code className="rounded bg-[#1f2937] px-1.5 py-0.5 text-xs text-emerald-400 font-mono">
              {children}
            </code>
          );
        },
        hr: () => <hr className="my-3 border-[#1f2937]" />,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-amber-500/50 pl-3 my-2 text-gray-400 text-sm italic">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
