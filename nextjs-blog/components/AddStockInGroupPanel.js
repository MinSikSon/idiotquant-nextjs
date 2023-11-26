import { Navbar } from "@material-tailwind/react";
import SearchPanel from "./SearchPanel";

export default function AddStockInGroupPanel(props) {
    return (
        <Navbar>
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
            />
        </Navbar>
    );
}
