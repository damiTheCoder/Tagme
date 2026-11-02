import type { Metadata } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tagly | Sell with an AI Agent",
  description:
    "Tagly is an AI agent that handles your customer chats, takes orders, and processes payments automatically.",
  openGraph: {
    title: "Tagly | Sell with an AI Agent",
    description: "Tagly is an AI agent that handles your customer chats, takes orders, and processes payments automatically.",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://www.usetagly.link",
    siteName: "Tagly",
    images: [
      {
        url: "/URL.png",
        width: 1200,
        height: 630,
        alt: "Tagly AI Sales Agent",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tagly | Sell with an AI Agent",
    description: "Tagly is an AI agent that handles your customer chats, takes orders, and processes payments automatically.",
    images: ["/URL.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
