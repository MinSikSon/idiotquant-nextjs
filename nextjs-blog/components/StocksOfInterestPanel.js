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
                    <Typography className="ml-3" variant="h6">삼성전자 추가하기</Typography>
                </div>
                <ListItemSuffix>
                    {/* <Chip className="border-none text-lg p-0 text-right" variant="outlined" size="lg" value={diffRatio + "%"} color={diffRatio > 0 ? 'red' : 'blue'} />
                    <Chip className="border-none py-0" variant="outlined" size="sm" value={props.close + "원"} /> */}
                </ListItemSuffix>
            </ListItem >
        );
    };

    return (<>
        <Tabs value={props.stocksOfInterest.tabs[props.stocksOfInterest.selectedTab].value}>
            <TabsHeader
                className="overflow-x-scroll rounded-none border-b border-blue-gray-100 bg-transparent p-0"
                indicatorProps={{ className: "bg-transparent border-b-2 border-gray-900 shadow-none rounded-none", }}>
                <ListItem className="p-0 pl-5">
                    {props.stocksOfInterest.tabs.map(({ label, value }, idx) => (
                        <Tab className="shrink-0 w-fit text-sm" onClick={() => props.handleStocksOfInterestChange(value)} key={idx} value={value}>
                            {label}
                        </Tab>
                    ))}
                    <ListItemSuffix className="shrink-0 w-fit">
                        <Button
                            className="p-2 mr-2 text-sm flex"
                            // variant="text"
                            onClick={(e) => {
                                e.preventDefault();
                                props.editGroup()
                            }}><PlusIcon strokeWidth={2} className="h-5 w-5" />추가</Button>
                    </ListItemSuffix>
                </ListItem>

            </TabsHeader>
            <TabsBody>
                {/* {props.stocksOfInterest.tabs.map(({ value, desc }, idx) => (
                    <TabPanel key={idx} value={value} className="text-sm text-black">
                        {desc}
                    </TabPanel>
                ))} */}
                <button className="flex" onClick={props.addNewStocksOfInterest}>
                    <ListNode />
                </button>
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
    </>);
}