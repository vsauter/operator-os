import type { Metadata } from "next";
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
      <body className="min-h-screen">
        <header className="border-b bg-white">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <h1 className="text-xl font-bold">OperatorOS</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
