import "@/app/global.css"
import "@radix-ui/themes/styles.css";
import { StoreProvider } from "./StoreProvider"
import NavbarWithSimpleLinks from "@/components/navigation"
import { ThemeProviderClient } from "./ThemeProviderClient";

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
      <body className="md:flex lg:flex">
        <StoreProvider>
          <ThemeProviderClient>
            <NavbarWithSimpleLinks />
            <div className="pt-16 md:flex-1 lg:flex-1 w-full h-full scroll-auto dark:bg-black">
              {children}
            </div>
          </ThemeProviderClient>
        </StoreProvider >
      </body>
    </html>
  )
}
