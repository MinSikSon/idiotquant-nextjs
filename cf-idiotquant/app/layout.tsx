import "@/app/global.css"
import { Nav } from "@/components/navigation"
import { StoreProvider } from "./StoreProvider"
import { LoadData } from "@/components/loadData"
import { TopPanel } from "@/components/panel/top"
import NavbarWithSimpleLinks from "@/components/navigation2"

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
      <html lang="en">
        <body>
          <LoadData />
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
