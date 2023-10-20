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

export default function NavbarDefault(props) {

    // React.useEffect(() => {
    //     window.addEventListener(
    //         "resize",
    //         () => window.innerWidth >= 960 && props.setOpenNav(false),
    //     );
    // }, []);

    const NavList = (props) => {
        return (
            <ul className="mt-2 mb-4 flex gap-2 lg:mb-0 lg:mt-0 lg:flex-row lg:items-center lg:gap-6">
                <Link href="./calculator">
                    <Calculator
                        scrollEffect={props.scrollEffect}

                        openCalculator={props.openCalculator}
                        setOpenCalculator={props.setOpenCalculator}

                        openSearchResult={props.openSearchResult}
                    />
                </Link>
            </ul>
        )
    };

    return (
        <Navbar className="mx-auto max-w-screen-xl p-0 pt-6">
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
                    <div className='font-serif 
                text-xl sm:text-xl md:text-2xl lg:text-3xl
                text-black header-contents text-center py-3
                sm:underline sm:decoration-2 md:decoration-4 sm:decoration-green-400'
                    >
                        {/* IDIOT<span className='text-green-400'>.</span>QUANT */}
                        IDIOT<br />QUANT
                    </div>
                </ListItemPrefix>}

                {/* <NavList
                    scrollEffect={props.scrollEffect}

                    openCalculator={props.openCalculator}
                    setOpenCalculator={props.setOpenCalculator}

                    setOpenSearchResult={props.setOpenSearchResult}
                    openSearchResult={props.openSearchResult}
                    searchStockCompanyInfo={props.searchStockCompanyInfo}
                    searchResult={props.searchResult}
                    inputValue={props.inputValue}
                    inputPlaceholder={props.inputPlaceholder}

                    // new state
                    marketInfoList={props.marketInfoList}

                    dictFilteredStockCompanyInfo={props.dictFilteredStockCompanyInfo}

                    getSearchingList={props.getSearchingList}
                    searchingList={props.searchingList}
                ></NavList> */}
                <Link href="./calculator">
                    <Calculator
                        scrollEffect={props.scrollEffect}

                        openCalculator={props.openCalculator}
                        setOpenCalculator={props.setOpenCalculator}

                        openSearchResult={props.openSearchResult}
                    />
                </Link>
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