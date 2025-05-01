import "@/app/global.css"
import { StoreProvider } from "./StoreProvider"
import NavbarWithSimpleLinks from "@/components/navigation2"
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
        <body className="lg:flex">
          <NavbarWithSimpleLinks />
          <div className="lg:flex-1 w-full h-full scroll-auto">
            {children}
          </div>
        </body>
      </html>
    </StoreProvider >
  )
}
