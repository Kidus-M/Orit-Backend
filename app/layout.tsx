import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://orit-backend.vercel.app"),
  title: {
    default: "Orit Tej | Ethiopian Honey Wine",
    template: "%s | Orit Tej",
  },
  description:
    "Handcrafted Ethiopian honey wine made in California from natural ingredients and a family recipe shared since 1987.",
  applicationName: "Orit Tej",
  keywords: [
    "Orit Tej",
    "Ethiopian honey wine",
    "Tej",
    "California honey wine",
    "Ethiopian wine",
  ],
  openGraph: {
    type: "website",
    siteName: "Orit Tej",
    title: "Orit Tej | Ethiopian Honey Wine",
    description:
      "A golden Ethiopian honey wine handcrafted in California and made to be shared.",
    images: [
      {
        url: "/hero-honey-wine.png",
        width: 1536,
        height: 1024,
        alt: "Orit Tej honey wine, honeycomb, and a golden glass",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Orit Tej | Ethiopian Honey Wine",
    description:
      "A golden Ethiopian honey wine handcrafted in California and made to be shared.",
    images: ["/hero-honey-wine.png"],
  },
  icons: {
    icon: "/app-icon.png",
    apple: "/app-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffcc20",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.variable}>
      <Analytics/>
      <body>{children}</body>
    </html>
  );
}

