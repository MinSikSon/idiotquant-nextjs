import "@/app/global.css"
import { StoreProvider } from "./StoreProvider"
import NavbarWithSimpleLinks from "@/components/navigation"
import { ThemeProviderClient } from "./ThemeProviderClient";

// app/layout.tsx
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
// Normalize는 선택사항이지만 Blueprint와 잘 어우러집니다.
import "normalize.css/normalize.css";
import LoadKakaoTotal from "@/components/loadKakaoTotal";
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
      </head>
      <body className="md:flex lg:flex bp5-body">
        <StoreProvider>
          <ThemeProviderClient>
            <AuthProvider>
              <NavbarWithSimpleLinks />
              <LoadKakaoTotal />
              <div className="md:flex-1 lg:flex-1 w-full h-full scroll-auto dark:bg-black">
                {children}
              </div>
            </AuthProvider>
          </ThemeProviderClient>
        </StoreProvider >
      </body>
    </html>
  )
}
