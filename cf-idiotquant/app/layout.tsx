import "@/app/global.css"
import { StoreProvider } from "./StoreProvider"
import NavbarWithSimpleLinks from "@/components/navigation2"
import { LoadData } from "@/components/loadData"

export const metadata = {
  title: 'idiot.quant',
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
      <html lang="en">
        <body>
          <div>
            <NavbarWithSimpleLinks />
            {/* <TopPanel /> */}
            <div className="w-full y-full scroll-auto">
              {children}
            </div>
            <div className="h-10"></div>
            {/* <Nav /> */}
          </div>
        </body>
      </html>
    </StoreProvider>
  )
}
