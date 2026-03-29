import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DarkosClaw // AI Terminal",
  description: "Open-source AI agent powered by free LLM APIs",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🦅</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-void text-phosphor h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
