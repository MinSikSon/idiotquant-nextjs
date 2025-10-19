import "@/app/global.css"
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";

import { StoreProvider } from "./StoreProvider"

import NavbarWithSimpleLinks from "@/components/navigation"

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
    <StoreProvider>
      <html lang="en"
      // suppressHydrationWarning
      >
        <head>
        </head>
        <body className="md:flex lg:flex">
          <Theme className="w-full">
            <NavbarWithSimpleLinks />
            <div className="pt-28 md:flex-1 lg:flex-1 w-full h-full scroll-auto dark:bg-black">
              {children}
            </div>
          </Theme>
        </body>
      </html>
    </StoreProvider >
  )
}
