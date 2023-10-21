import React from "react";
import {
    Navbar,
    MobileNav,
    Typography,
    Button,
    IconButton,
    ListItem,
    ListItemPrefix,
    ListItemSuffix,
} from "@material-tailwind/react";
import Link from "next/link";
import Calculator from "./Calculator";
import Search from "./Search";
import Oauth from "./Oauth";

export default function NavbarDefault(props) {

    // React.useEffect(() => {
    //     window.addEventListener(
    //         "resize",
    //         () => window.innerWidth >= 960 && props.setOpenNav(false),
    //     );
    // }, []);

    const NavList = (props) => {
        return (
            <ul className="flex items-center gap-3 mb-0 mt-0 lg:flex-row lg:gap-6">
                <Calculator
                    scrollEffect={props.scrollEffect}

                    openCalculator={props.openCalculator}
                    setOpenCalculator={props.setOpenCalculator}

                    openSearchResult={props.openSearchResult}
                />
                <Oauth
                    authorizeCode={props.authorizeCode}
                    accessToken={props.accessToken}
                    scrollEffect={props.scrollEffect}
                    openSearchResult={props.openSearchResult}
                    loginStatus={props.loginStatus}
                />
            </ul>
        )
    };

    return (
        <Navbar className="mx-auto max-w-screen-xl p-0">
            <ListItem className='p-0'>
                {/* <div className="container mx-auto flex items-center justify-between text-blue-gray-900"> */}
                {/* <Typography
                    as="a"
                    href="#"
                    className="mr-4 cursor-pointer py-1.5 font-medium"
                >
                    IDIOT QUANT
                </Typography> */}
                {props.openSearchResult ? <></> : <ListItemPrefix>
                    <div className='pl-1 pt-1 font-serif text-base sm:text-xl md:text-2xl lg:text-3xl text-black header-contents text-center sm:underline sm:decoration-2 md:decoration-4 sm:decoration-green-400'>
                        {/* IDIOT<span className='text-green-400'>.</span>QUANT */}
                        IDIOT<br />QUANT
                    </div>
                </ListItemPrefix>}

                <NavList
                    scrollEffect={props.scrollEffect}

                    openCalculator={props.openCalculator}
                    setOpenCalculator={props.setOpenCalculator}

                    openSearchResult={props.openSearchResult}
                    authorizeCode={props.authorizeCode}
                    accessToken={props.accessToken}
                    loginStatus={props.loginStatus}
                ></NavList>

                <ListItemSuffix>
                    <Search
                        setOpenSearchResult={props.setOpenSearchResult}
                        searchStockCompanyInfo={props.searchStockCompanyInfo}
                        searchResult={props.searchResult}
                        inputValue={props.inputValue}
                        inputPlaceholder={props.inputPlaceholder}

                        // new state
                        marketInfoList={props.marketInfoList}

                        dictFilteredStockCompanyInfo={props.dictFilteredStockCompanyInfo}

                        openSearchResult={props.openSearchResult}

                        getSearchingList={props.getSearchingList}
                        searchingList={props.searchingList}
                        scrollEffect={props.scrollEffect}
                    />
                </ListItemSuffix>
            </ListItem>
        </Navbar>
    );
}