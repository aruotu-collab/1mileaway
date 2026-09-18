import type { Metadata } from "next";
import { Newsreader, Outfit } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GoogleAnalytics } from "@/components/google-analytics";
import { APP_URL } from "@/lib/constants";
import { googleSiteVerification } from "@/lib/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const googleVerification = googleSiteVerification();

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "1mileaway — professionals nearby who can actually help",
    template: "%s · 1mileaway",
  },
  description: "Find a professional nearby who is genuinely available and ready to help.",
  verification: googleVerification ? { google: googleVerification } : undefined,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${outfit.variable} ${newsreader.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <GoogleAnalytics />
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
