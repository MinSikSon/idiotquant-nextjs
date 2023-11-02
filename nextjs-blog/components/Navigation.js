import React from "react";
import {
    Navbar,
    ListItem,
    ListItemPrefix,
    ListItemSuffix,
} from "@material-tailwind/react";
import Calculator from "./Calculator";
import SearchPanel from "./SearchPanel";
import Oauth from "./Oauth";
import Etc from "./Etc";

export default function NavbarDefault(props) {
    // console.log(`%c NavbarDefault`, `color:blue; background:white`);
    const NavList = (props) => {
        if (props.searchPanelIsOpened) return <></>;

        return (
            <ul className="flex items-center gap-3 mb-0 mt-0 lg:flex-row lg:gap-6">
                <Oauth
                    authorizeCode={props.authorizeCode}
                    accessToken={props.accessToken}
                    loginStatus={props.loginStatus}

                    openMenu={props.openMenu}
                    setOpenMenu={props.setOpenMenu}
                />
                <Calculator
                    openCalculator={props.openCalculator}
                    setOpenCalculator={props.setOpenCalculator}
                />
                <Etc />
            </ul>
        )
    };

    return (
        <Navbar className="p-0 text-black">
            <ListItem>
                <NavList
                    searchPanelIsOpened={props.searchPanelIsOpened}

                    scrollEffect={props.scrollEffect}

                    openCalculator={props.openCalculator}
                    setOpenCalculator={props.setOpenCalculator}

                    authorizeCode={props.authorizeCode}
                    accessToken={props.accessToken}
                    loginStatus={props.loginStatus}

                    openMenu={props.openMenu}
                    setOpenMenu={props.setOpenMenu}
                />

                <ListItemSuffix className={`${props.searchPanelIsOpened ? 'm-0 w-full' : ''}`}>
                    <SearchPanel
                        searchPanelIsOpened={props.searchPanelIsOpened}
                        setSearchPanelIsOpened={props.setSearchPanelIsOpened}

                        handleSearchStockCompanyInfo={props.handleSearchStockCompanyInfo}
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
    );
}