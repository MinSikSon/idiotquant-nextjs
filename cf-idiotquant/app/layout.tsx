import "@/app/global.css"
import { Nav } from "@/components/navigation"
import { StoreProvider } from "./StoreProvider"
import { LoadData } from "@/components/loadData"
import { TopPanel } from "@/components/panel/top"

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
          <TopPanel />
          <div className="fixed top-8 w-full">
            {children}
          </div>
          <Nav />
        </body>
      </html>
    </StoreProvider>
  )
}
