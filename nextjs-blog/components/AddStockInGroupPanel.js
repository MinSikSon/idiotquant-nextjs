import { Navbar } from "@material-tailwind/react";
import SearchPanel from "./SearchPanel";

export default function AddStockInGroupPanel(props) {
    if ('AddStockInGroupPanel' !== props.openedPanel) return <></>;
    return (
        <Navbar className="px-2">
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
        </Navbar>
    );
}
