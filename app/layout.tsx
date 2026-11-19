import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { firm, siteUrl } from "@/lib/firm";
import { cn } from "@/lib/utils";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TaxHelping2Day",
    template: "%s | TaxHelping2Day",
  },
  description:
    "Tax preparation, bookkeeping, and financial management for individuals, businesses, and non-profits. Hamilton, Texas.",
  openGraph: {
    siteName: firm.name,
    type: "website",
    images: ["/brand/banner.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full", playfair.variable, sourceSans.variable, "font-sans")} suppressHydrationWarning>
      <body className="min-h-full font-sans antialiased">
        <ThemeProvider>
          <ClerkProvider appearance={{ theme: shadcn }}>
            {children}
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}