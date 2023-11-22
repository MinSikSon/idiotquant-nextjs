import { Tabs, Tab, TabsBody, TabsHeader, ListItem, ListItemSuffix, Button, ListItemPrefix, Chip, Typography } from "@material-tailwind/react";
import TablePanel from "./TablePanel";
import { HeartIcon, PlusIcon } from "@heroicons/react/24/outline";

export default function StocksOfInterestPanel(props) {
    // console.log(`%c StocksOfInterestPanel 1`, `color:blue; background:white`);
    if (false === props.stocksOfInterestPanelOpened) return <></>;
    // console.log(`%c StocksOfInterestPanel 2`, `color:blue; background:white`);

    const ListNode = (props) => {
        return (
            <ListItem className="p-0 border-b-2">
                <ListItemPrefix className="mr-2 w-24">
                    <Chip className="border-none py-0" size="sm" variant="outlined" value={<PlusIcon className="h-5 w-5" />} />
                </ListItemPrefix>
                <div>
                    <Typography className="ml-3" variant="h6">추가하기</Typography>
                </div>
                <ListItemSuffix>
                    {/* <Chip className="border-none text-lg p-0 text-right" variant="outlined" size="lg" value={diffRatio + "%"} color={diffRatio > 0 ? 'red' : 'blue'} />
                    <Chip className="border-none py-0" variant="outlined" size="sm" value={props.close + "원"} /> */}
                </ListItemSuffix>
            </ListItem >
        );
    };

    return (
        <div>
            {/* stockOfInterestPanel */}
            <Tabs value={props.stocksOfInterest.tabs[props.stocksOfInterest.selectedTab].value}>
                <TabsHeader
                    className="flex rounded-none border-b border-blue-gray-100 bg-transparent p-0"
                    indicatorProps={{ className: "bg-transparent border-b-2 border-gray-900 shadow-none rounded-none", }}>
                    <div className="overflow-x-scroll flex w-10/12">
                        {props.stocksOfInterest.tabs.map(({ label, value }, idx) => (
                            <Tab className="shrink-0 w-fit text-sm" onClick={() => props.handleStocksOfInterestChange(value)} key={idx} value={value}>
                                {label}
                            </Tab>
                        ))}
                    </div>
                    <Button
                        className="p-2 mr-1 text-sm flex shrink-0 w-2/12"
                        // variant="text"
                        color="blue"
                        onClick={(e) => {
                            e.preventDefault();
                            props.editGroup()
                        }}><PlusIcon strokeWidth={2} className="h-5 w-5" />추가</Button>
                </TabsHeader>
                <TabsBody>
                    {props.stocksOfInterest.selectedTab < 2 ?
                        <button disabled className="bg-gray-100 text-gray-300 w-full"><ListNode /></button>
                        :
                        <button className="flex" onClick={() => props.addNewStocksOfInterest('삼성전자')}>
                            <ListNode />
                        </button>
                    }
                    <TablePanel
                        marqueueDisplay={false}
                        searchPanelIsOpened={props.searchPanelIsOpened}

                        dictFilteredStockCompanyInfo={props.dictFilteredStockCompanyInfo}
                        arrayFilteredStocksList={props.arrayFilteredStocksList}
                        latestStockCompanyInfo={props.latestStockCompanyInfo}
                        marketInfoList={props.marketInfoList}

                        clickedRecentlyViewedStock={props.clickedRecentlyViewedStock}
                    />
                </TabsBody>
            </Tabs>
        </div>);
}