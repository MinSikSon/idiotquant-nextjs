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

export const metadata = {
  title: 'idiotquant.com',
  description: 'We recommend stock picks derived from a quantitative strategy.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en"
    // suppressHydrationWarning
    >
      <head>
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
