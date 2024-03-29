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
import { ArrowUturnLeftIcon } from "@heroicons/react/24/outline";
import BackTesting from "./BackTesting";

export default function NavigationPanel(props) {
    if ('NewGroupPanel' === props.openedPanel) return <></>;
    if ('AddStockInGroupPanel' === props.openedPanel) return <></>;

    // console.log(`%c NavigationPanel`, `color:blue; background:white`);
    // console.log(`props.openedPanel`, props.openedPanel);

    if ('StocksOfInterestPanel' === props.openedPanel) {
        return (
            <Navbar className="px-2">
                <ListItem className={`p-0 m-0 text-black`}>
                    <ListItemPrefix>
                        <div onClick={(e) => {
                            props.handleArrowUturnLeftIcon(e);
                        }}>
                            <ArrowUturnLeftIcon strokeWidth={2} className="h-6 w-6" />
                        </div>
                    </ListItemPrefix>
                </ListItem>
            </Navbar>
        )
    }

    return (
        <Navbar className="px-2 sm:fixed sm:w-1/2 md:w-1/2 lg:w-1/2 xl:w-1/2 2xl:w-1/2">
            <ListItem className="p-0 m-0">
                {'SearchPanel' === props.openedPanel ?
                    <></> :
                    <ul className="flex items-center gap-2 mb-0 mt-0 pr-2 lg:flex-row lg:gap-6">
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
                        <BackTesting setOpenedPanel={props.setOpenedPanel} />

                    </ul>
                }
                <ListItemSuffix className={`${'SearchPanel' === props.openedPanel ? 'm-0 w-full' : ''}`}>
                    <SearchPanel
                        openedPanel={props.openedPanel}
                        setOpenedPanel={props.setOpenedPanel}

                        handleSearchStockCompanyInfo={props.handleSearchStockCompanyInfo}
                        searchResult={props.searchResult}
                        inputValue={props.inputValue}
                        inputPlaceholder={props.inputPlaceholder}

                        marketInfoList={props.marketInfoList}

                        getSearchingList={props.getSearchingList}
                        searchingList={props.searchingList}

                        setSearchResult={props.setSearchResult}

                        handleArrowUturnLeftIcon={props.handleArrowUturnLeftIcon}

                        financialInfoList={props.financialInfoList}
                    />
                </ListItemSuffix>
            </ListItem>
        </Navbar>
    );
}
