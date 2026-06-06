import "@/app/global.css";
import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_KR, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansKr = Noto_Sans_KR({
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  variable: "--font-noto-kr",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1915' },
  ],
};
import { StoreProvider } from "./StoreProvider";
import NavbarWithSimpleLinks from "@/components/navigation";
import { ThemeProviderClient } from "./ThemeProviderClient";
import { AuthProvider } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  metadataBase: new URL('https://idiotquant.com'),
  title: {
    default: 'IdiotQuant - 무료 NCAV·저PBR·저PER 주식 스크리너',
    template: '%s | IdiotQuant',
  },
  description: '퀀트 알고리즘이 매일 코스피·코스닥 2,000개 종목을 스캔해 NCAV, 저PBR, 저PER, S-RIM 기준 저평가 주식을 자동 발굴합니다. 재무분석·목표주가·자동매매 기능 제공.',
  keywords: [
    '퀀트 투자', 'NCAV 주식', '저평가 주식', '주식 스크리너',
    '저PBR 주식', '저PER 주식', 'S-RIM', '주식 재무분석',
    '목표주가', '자동매매', '코스피 저평가', '코스닥 저평가',
    '퀀트 전략', '주식 발굴', '가치투자',
  ],
  authors: [{ name: 'IdiotQuant', url: 'https://idiotquant.com' }],
  creator: 'IdiotQuant',
  publisher: 'IdiotQuant',
  appleWebApp: {
    capable: true,
    title: 'IdiotQuant',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://idiotquant.com',
  },
  openGraph: {
    title: 'IdiotQuant - 무료 NCAV·저PBR 주식 스크리너',
    description: '퀀트 알고리즘이 매일 코스피·코스닥 저평가 주식을 발굴합니다. NCAV, 저PBR, 저PER, S-RIM 전략 제공.',
    url: 'https://idiotquant.com',
    siteName: 'IdiotQuant',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IdiotQuant - 무료 NCAV·저PBR 주식 스크리너',
    description: '퀀트 알고리즘이 매일 코스피·코스닥 저평가 주식을 발굴합니다.',
    creator: '@idiotquant',
  },
};

const jsonLdWebSite = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  'name': 'IdiotQuant',
  'url': 'https://idiotquant.com',
  'description': '퀀트 전략 기반 무료 주식 스크리너 및 재무분석 서비스',
  'potentialAction': {
    '@type': 'SearchAction',
    'target': {
      '@type': 'EntryPoint',
      'urlTemplate': 'https://idiotquant.com/analyze?ticker={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
};

const jsonLdOrg = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  'name': 'IdiotQuant',
  'url': 'https://idiotquant.com',
  'logo': 'https://idiotquant.com/images/logo.png',
  'description': '퀀트 알고리즘 기반 무료 주식 스크리너 및 재무분석 서비스',
  'contactPoint': {
    '@type': 'ContactPoint',
    'contactType': 'customer support',
    'availableLanguage': '한국어',
  },
};

const jsonLdApp = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  'name': 'IdiotQuant',
  'url': 'https://idiotquant.com',
  'description': '퀀트 전략(NCAV, 저PBR, 저PER, S-RIM)으로 코스피·코스닥 저평가 주식을 매일 자동 발굴하는 무료 주식 스크리너.',
  'applicationCategory': 'FinanceApplication',
  'operatingSystem': 'Web',
  'offers': {
    '@type': 'Offer',
    'price': '0',
    'priceCurrency': 'KRW',
  },
  'featureList': 'NCAV 스크리너, 저PBR 스크리너, 주식 재무분석, 목표주가 계산, 자동매매',
  'inLanguage': 'ko',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="dns-prefetch" href="//pagead2.googlesyndication.com" />
        <link rel="dns-prefetch" href="//www.googletagservices.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdApp) }}
        />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6995198721227228"
          crossOrigin="anonymous"
        />
        <meta name="google-adsense-account" content="ca-pub-6995198721227228" />
      </head>
      <body className={cn(
        inter.variable,
        notoSansKr.variable,
        jetbrainsMono.variable,
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
