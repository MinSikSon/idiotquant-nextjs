import "@/app/global.css";
import { StoreProvider } from "./StoreProvider";
import NavbarWithSimpleLinks from "@/components/navigation";
import { ThemeProviderClient } from "./ThemeProviderClient";
import { AuthProvider } from "@/components/auth-provider";
import Script from "next/script";
import { cn } from "@/lib/utils";

/**
 * IDIOTQUANT ROOT LAYOUT
 * - BlueprintJS 제거 및 Tailwind CSS 최적화 완료
 */

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
    <html lang="ko" suppressHydrationWarning className="antialiased">
      <head>
        {/* 1. 구조화 데이터 주입 */}
        <Script
          id="structured-data"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* 2. 애드센스 코드 스니펫 */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6995198721227228"
          crossOrigin="anonymous"
        />
        <meta name="google-adsense-account" content="ca-pub-6995198721227228" />
      </head>
      <body className={cn(
        "min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-50",
        "flex flex-col md:flex-row overflow-x-hidden"
      )}>
        <StoreProvider>
          <ThemeProviderClient>
            <AuthProvider>
              {/* 네비게이션 (사이드바 또는 상단바) */}
              <NavbarWithSimpleLinks />
              
              {/* 메인 콘텐츠 컨테이너 */}
              <main className="flex-1 w-full min-h-screen flex flex-col">
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                  {children}
                </div>
              </main>
            </AuthProvider>
          </ThemeProviderClient>
        </StoreProvider>
      </body>
    </html>
  );
}