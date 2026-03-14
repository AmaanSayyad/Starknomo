import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://starknomo-puce.vercel.app'),
  title: "Starknomo - Binary Options on Starknet",
  description:
    "On-chain binary options trading dApp on Starknet Sepolia. Powered by Pyth Hermes price attestations and Supabase. Oracle-bound resolution, minimal trust.",
  keywords: [
    "binary options",
    "crypto trading",
    "Pyth oracle",
    "Starknet",
    "STRK",
    "Web3",
    "prediction",
  ],
  icons: {
    icon: [
      { url: "/starknomo-logo.png", type: "image/png", sizes: "512x512" },
      { url: "/starknomologo.ico", sizes: "32x32", type: "image/x-icon" },
    ],
    shortcut: "/starknomo-logo.png",
    apple: "/starknomo-logo.png",
  },
  openGraph: {
    title: "Starknomo - Binary Options on Starknet",
    description:
      "On-chain binary options trading dApp on Starknet Sepolia. Powered by Pyth Hermes and Supabase. Oracle-bound resolution, minimal trust.",
    images: [{ url: '/starknomo-logo.png', width: 512, height: 512, alt: 'Starknomo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Starknomo - Binary Options on Starknet",
    description: "On-chain binary options on Starknet Sepolia. Oracle-bound resolution, minimal trust.",
    images: ['/starknomo-logo.png'],
  },
};

import { Header } from "@/components/Header";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} antialiased bg-[#02040a] text-white h-screen overflow-hidden flex flex-col`}
      >
        <Providers>
          <Header />
          <main className="flex-1 relative overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

