import React from "react";
import {
    Navbar,
    ListItem,
    ListItemPrefix,
    ListItemSuffix,
} from "@material-tailwind/react";
import Calculator from "./Calculator";
import Search from "./Search";
import Oauth from "./Oauth";
import Etc from "./Etc";

export default function NavbarDefault(props) {
    const NavList = (props) => {

        if (props.openSearchResult) return <></>;

        return (
            <ul className="flex items-center gap-3 mb-0 mt-0 lg:flex-row lg:gap-6">
                <Oauth
                    authorizeCode={props.authorizeCode}
                    accessToken={props.accessToken}
                    scrollEffect={props.scrollEffect}
                    loginStatus={props.loginStatus}

                    openMenu={props.openMenu}
                    setOpenMenu={props.setOpenMenu}
                />
                <Calculator
                    scrollEffect={props.scrollEffect}

                    openCalculator={props.openCalculator}
                    setOpenCalculator={props.setOpenCalculator}
                />
                <Etc />
            </ul>
        )
    };

    return (
        <>
            <Navbar className="mx-auto max-w-screen-xl p-0 text-black pt-2">
                <ListItem className={`p-0 ${props.openSearchResult ? '' : 'pl-6'}`}>
                    <NavList
                        openSearchResult={props.openSearchResult}

                        scrollEffect={props.scrollEffect}

                        openCalculator={props.openCalculator}
                        setOpenCalculator={props.setOpenCalculator}

                        authorizeCode={props.authorizeCode}
                        accessToken={props.accessToken}
                        loginStatus={props.loginStatus}

                        openMenu={props.openMenu}
                        setOpenMenu={props.setOpenMenu}
                    ></NavList>

                    <ListItemSuffix>
                        <Search
                            openSearchResult={props.openSearchResult}

                            setOpenSearchResult={props.setOpenSearchResult}
                            searchStockCompanyInfo={props.searchStockCompanyInfo}
                            searchResult={props.searchResult}
                            inputValue={props.inputValue}
                            inputPlaceholder={props.inputPlaceholder}

                            marketInfoList={props.marketInfoList}

                            dictFilteredStockCompanyInfo={props.dictFilteredStockCompanyInfo}

                            getSearchingList={props.getSearchingList}
                            searchingList={props.searchingList}
                            scrollEffect={props.scrollEffect}
                        />
                    </ListItemSuffix>
                </ListItem>
            </Navbar>
        </>
    );
}