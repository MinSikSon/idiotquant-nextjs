import "@/app/global.css"
import { StoreProvider } from "./StoreProvider"
import NavbarWithSimpleLinks from "@/components/navigation"
import { LoadData } from "@/components/LoadData"
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
          <div className="md:flex-1 lg:flex-1 w-full h-full scroll-auto">
            {children}
          </div>
        </body>
      </html>
    </StoreProvider >
  )
}
