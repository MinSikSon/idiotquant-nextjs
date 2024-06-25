"use client"

import React from "react";
import {
    Navbar,
    MobileNav,
    Typography,
    Button,
    IconButton,
    Card,
    ListItem,
    ListItemSuffix,
} from "@material-tailwind/react";
import Oauth from "./Oauth";
import Calculator from "./Calculator";
import Etc from "./Etc";
import BackTesting from "./BackTesting";
import SearchPanel from "./SearchPanel";
import Link from "next/link";
import { HomeIcon, PlayIcon } from "@heroicons/react/24/outline";
import BackTestingPanel from "../app/backtest/page";


import { usePathname } from "next/navigation";

export const Nav = () => {
    const pathname = usePathname();

    const defaultDeco = 'pr-1';
    const decorations = 'underline decoration-green-400';
    const hoverDecorations = 'hover:underline hover:decoration-green-400';
    return (
        <nav className='flex justify-center text-xl lx:text-2xl 2xl:text-2xl'>
            <div className='flex'>
                <Link className={`flex-auto ${defaultDeco} ${hoverDecorations} ${pathname === "/" ? decorations : ""}`} href="/">Home</Link>
                <Link className={`flex-auto ${defaultDeco} ${hoverDecorations} ${pathname === "/calculator" ? decorations : ""}`} href="/calculator">Calculator</Link>
                {/* <Link className={`flex-auto ${defaultDeco} ${hoverDecorations}  ${pathname === "/quotes" ? decorations : ""}`} href="/quotes">Quotes</Link> */}
            </div>
        </nav>
    );
}

// export function StickyNavbar(props) {
//     return (
//         // <Navbar className="px-2 w-full sm:w-1/2 md:w-1/2 lg:w-1/2 xl:w-1/2 2xl:w-1/2">
//         <Navbar className="px-2 w-full">
//             <ListItem className="p-0 m-0">
//                 <ul className="flex items-center gap-2 mb-0 mt-0 pr-2 lg:flex-row lg:gap-6">
//                     <Link href="/">
//                         <HomeIcon strokeWidth={2} className="h-6 w-6 text-black hover:text-gray-500" />
//                     </Link>
//                     <Oauth
//                         authorizeCode={props.authorizeCode}
//                         accessToken={props.accessToken}
//                         loginStatus={props.loginStatus}

//                         openMenu={props.openMenu}
//                         setOpenMenu={props.setOpenMenu}
//                     />
//                     <Calculator
//                         openCalculator={props.openCalculator}
//                         setOpenCalculator={props.setOpenCalculator}
//                     />
//                     <Etc />
//                     <Link href="/backtest">
//                         <div className="flex items-center text-black hover:text-gray-500">
//                             <PlayIcon strokeWidth={2} className="h-5 w-5" />
//                             <div className="text-xs">백테스트</div>
//                         </div>
//                     </Link>
//                 </ul>
//                 <ListItemSuffix className={`${'SearchPanel' === props.openedPanel ? 'm-0 w-full' : ''}`}>
//                     <SearchPanel
//                         openedPanel={props.openedPanel}
//                         setOpenedPanel={props.setOpenedPanel}

//                         handleSearchStockCompanyInfo={props.handleSearchStockCompanyInfo}
//                         searchResult={props.searchResult}
//                         inputValue={props.inputValue}
//                         inputPlaceholder={props.inputPlaceholder}

//                         marketInfoList={props.marketInfoList}

//                         getSearchingList={props.getSearchingList}
//                         searchingList={props.searchingList}

//                         setSearchResult={props.setSearchResult}

//                         handleArrowUturnLeftIcon={props.handleArrowUturnLeftIcon}

//                         financialInfoList={props.financialInfoList}
//                     />
//                 </ListItemSuffix>
//             </ListItem>
//         </Navbar>
//     )
// }