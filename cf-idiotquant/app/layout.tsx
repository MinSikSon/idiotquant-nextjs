import "@/app/global.css";
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
import { StoreProvider } from "./StoreProvider";
import NavbarWithSimpleLinks from "@/components/navigation";
import { ThemeProviderClient } from "./ThemeProviderClient";
import { AuthProvider } from "@/components/auth-provider";
import Script from "next/script";
import { cn } from "@/lib/utils";

export const metadata = {
  title: {
    default: 'IdiotQuant - 퀀트 전략 기반 주식 추천',
    template: '%s | IdiotQuant',
  },
  description: '데이터로 증명된 퀀트 전략을 통해 최적의 주식 종목을 추천합니다. 스마트한 투자의 시작, 이디엇퀀트.',
  alternates: {
    canonical: 'https://idiotquant.com',
  },
  openGraph: {
    title: 'IdiotQuant - 데이터 기반 퀀트 투자',
    description: '퀀트 알고리즘이 찾아낸 저평가 우량주 확인하기',
    url: 'https://idiotquant.com',
    siteName: 'IdiotQuant',
    locale: 'ko_KR',
    type: 'website',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  'name': 'IdiotQuant',
  'url': 'https://idiotquant.com',
  'description': 'Quantitative stock recommendation strategy service.',
  'applicationCategory': 'FinanceApplication',
  'operatingSystem': 'Web, Android, iOS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <Script
          id="structured-data"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6995198721227228"
          crossOrigin="anonymous"
        />
        <meta name="google-adsense-account" content="ca-pub-6995198721227228" />
      </head>
      <body className={cn(
        "min-h-screen font-sans antialiased",
        "bg-[#faf9f7] dark:bg-[#1a1915] text-neutral-900 dark:text-neutral-50"
      )}>
        <StoreProvider>
          <ThemeProviderClient>
            <AuthProvider>
              <NavbarWithSimpleLinks />
              {/* offset: mobile top header + bottom tab bar; desktop: sidebar left margin */}
              <main className={cn(
                "md:ml-[220px]",
                "pt-[48px] md:pt-0",
                "pb-[64px] md:pb-0",
                "min-h-screen overflow-x-hidden"
              )}>
                {children}
              </main>
            </AuthProvider>
          </ThemeProviderClient>
        </StoreProvider>
      </body>
    </html>
  );
}
