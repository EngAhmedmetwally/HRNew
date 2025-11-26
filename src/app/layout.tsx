'use client';

import { PT_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { AppLayout } from "@/components/layout/app-layout";
import Head from 'next/head';

const ptSans = PT_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  variable: "--font-pt-sans",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <Head>
        <title>HighClass HR</title>
        <meta name="description" content="نظام ذكي للحضور والانصراف والرواتب." />
        <meta name="application-name" content="HighClass HR" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="HighClass HR" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#223A5E" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#223A5E" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </Head>
      <body className={cn("font-body antialiased", ptSans.variable)}>
        <FirebaseClientProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
