import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "OperatorOS",
  description: "MCP orchestration for AI briefings",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <header className="border-b bg-white">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold hover:text-gray-700">
              OperatorOS
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/settings"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Settings
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
