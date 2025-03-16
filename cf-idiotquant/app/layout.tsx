import "@/app/global.css"
import { StoreProvider } from "./StoreProvider"
import NavbarWithSimpleLinks from "@/components/navigation2"
import { LoadData } from "@/components/loadData"

export const metadata = {
  title: 'idiotquant.com',
  description: 'We recommend stock picks derived from a quantitative strategy.',
}

import { Roboto_Mono } from 'next/font/google';
const roboto_mono = Roboto_Mono({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
})

// import { Noto_Sans_KR } from 'next/font/google';
// const noto_sans_kr = Noto_Sans_KR({
//   weight: '400',
//   subsets: ['latin'],
//   display: 'swap',
// })

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
          <div className={`${roboto_mono.className}`}>
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
    </StoreProvider >
  )
}
