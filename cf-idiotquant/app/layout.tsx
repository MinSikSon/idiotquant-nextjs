import "@/app/global.css"
import { StoreProvider } from "./StoreProvider"
import NavbarWithSimpleLinks from "@/components/navigation"
import { LoadData } from "@/components/loadData"

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
      <LoadData />
      <html lang="en"
      // suppressHydrationWarning
      >
        <head>
        </head>
        <body className="md:flex lg:flex">
          <NavbarWithSimpleLinks />
          <div className="pt-28 md:flex-1 lg:flex-1 w-full h-full scroll-auto dark:bg-black">
            {children}
          </div>
        </body>
      </html>
    </StoreProvider >
  )
}
