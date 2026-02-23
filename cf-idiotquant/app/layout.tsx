import "@/app/global.css"
import { StoreProvider } from "./StoreProvider"
import NavbarWithSimpleLinks from "@/components/navigation"
import { ThemeProviderClient } from "./ThemeProviderClient";

// app/layout.tsx
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
// Normalize는 선택사항이지만 Blueprint와 잘 어우러집니다.
import "normalize.css/normalize.css";
import { AuthProvider } from "@/components/auth-provider";
import Script from "next/script";

export const metadata = {
  title: {
    default: 'IdiotQuant - 퀀트 전략 기반 주식 추천',
    template: '%s | IdiotQuant',
  },
  description: '데이터로 증명된 퀀트 전략을 통해 최적의 주식 종목을 추천합니다. 스마트한 투자의 시작, 이디엇퀀트.',
  // 한국어 타겟팅 최적화
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
  '@type': 'WebApplication', // 또는 SoftwareApplication
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
        {/* 1. 구조화 데이터 주입 (검색 결과 최적화) */}
        <Script
          id="structured-data"
          type="application/ld+json"
          strategy="afterInteractive" // 페이지 상호작용이 가능해진 직후 주입
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* 2. 애드센스 코드 스니펫 주입 */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6995198721227228"
          crossOrigin="anonymous"
        />
        {/* 3. (선택사항) 메타 태그까지 넣어두면 더 확실합니다 */}
        <meta name="google-adsense-account" content="ca-pub-6995198721227228" />
      </head>
      <body className="md:flex lg:flex bp5-body">
        <StoreProvider>
          <ThemeProviderClient>
            <AuthProvider>
              <NavbarWithSimpleLinks />
              <div className="md:flex-1 lg:flex-1 w-full h-full scroll-auto dark:!bg-black">
                {children}
              </div>
            </AuthProvider>
          </ThemeProviderClient>
        </StoreProvider >
      </body>
    </html>
  )
}
