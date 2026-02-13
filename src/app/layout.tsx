import type { Metadata } from "next";
import { Outfit } from "next/font/google"; // Using Outfit for a modern, trust-focused look
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FastSave - Instagram Video Downloader",
    template: "%s | FastSave",
  },
  description: "Download Instagram Videos, Reels, Photos, and Stories for free. Fast, secure, and compatible with all devices.",
  metadataBase: new URL("https://fastvideosave.net"), // Placeholder URL
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "FastSave",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} antialiased min-h-screen flex flex-col`}>
        <Header />
        <main className="flex-grow pt-16">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
