import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DarkosClaw — AI Agent",
  description: "Your autonomous AI agent — web search, page reading & long-term memory. Powered by free LLMs.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%23e8441a'/><stop offset='100%25' stop-color='%23ff6b35'/></linearGradient></defs><rect width='100' height='100' rx='22' fill='url(%23g)'/><text y='.85em' x='50%25' text-anchor='middle' font-size='58' font-weight='800' fill='white' font-family='Inter,sans-serif'>D</text></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
