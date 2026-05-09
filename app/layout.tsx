import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FinAgent — AI Financial Intelligence',
  description:
    'Real-time AI-powered financial analysis with live market data, news, and macro context.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <body className="h-screen overflow-hidden bg-[#050a0e] text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
