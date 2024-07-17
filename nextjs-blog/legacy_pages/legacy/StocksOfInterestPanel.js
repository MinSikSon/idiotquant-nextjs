import { Tabs, Tab, TabsBody, TabsHeader, ListItem, ListItemSuffix, Button, ListItemPrefix, Chip, Typography } from "@material-tailwind/react";
import TablePanel from "./TablePanel";
import { PlusIcon } from "@heroicons/react/24/outline";

export default function StocksOfInterestPanel(props) {
    if ('StocksOfInterestPanel' !== props.openedPanel) return <></>;

    // console.log(`%c StocksOfInterestPanel`, `color:blue; background:white`);

    const ListNode = (props) => {
        return (
            <ListItem className="p-0 pt-6 border-b-2 w-full">
                <button className="flex w-9/12"
                    onClick={() => props.setOpenedPanel('AddStockInGroupPanel')}
                >
                    <ListItemPrefix className="mr-2">
                        <Chip className="border-none py-0" size="sm" variant="outlined" value={<PlusIcon className="h-5 w-5" />} />
                    </ListItemPrefix>
                    <Typography className="ml-3" variant="h6">종목 추가하기</Typography>
                </button>
                <ListItemSuffix className='w-3/12 p-0 m-0'>
                    <Button onClick={() => props.setOpenedPanel('DeleteGroupPanel')}
                        className="w-full p-0" color="red" variant="text" size="lg">그룹 삭제</Button>
                </ListItemSuffix>
            </ListItem >
        );
    };

    return (
        <div>
            <Tabs value={props.stocksOfInterest.tabs[props.selectedStocksOfInterestTab].value}>
                <TabsHeader
                    className="flex rounded-none border-b border-blue-gray-100 bg-transparent p-0"
                    indicatorProps={{ className: "bg-transparent border-b-2 border-gray-900 shadow-none rounded-none", }}>
                    <div className="overflow-x-scroll flex w-4/5">
                        {props.stocksOfInterest.tabs.map(({ label, value }, idx) => (
                            <Tab
                                className={`shrink-0 w-fit text-sm rounded-t ${idx < 2 ? 'line-through' : ''}`}
                                onClick={() => props.handleStocksOfInterestChange(value)}
                                key={value}
                                value={value}>
                                {label}
                            </Tab>
                        ))}
                    </div>
                    <Button
                        className="flex p-2 mr-1 text-sm shrink-0 w-1/5 self-center"
                        color="blue"
                        onClick={(e) => {
                            e.preventDefault();
                            props.setOpenedPanel('NewGroupPanel')
                        }}><PlusIcon strokeWidth={3} className="h-4 w-4" /><div>추가</div></Button>
                </TabsHeader>
                <TabsBody>
                    {props.selectedStocksOfInterestTab < 2 ?
                        <></>
                        :
                        <ListNode setOpenedPanel={props.setOpenedPanel} />
                    }
                    <TablePanel
                        marqueueDisplay={false}
                        searchPanelIsOpened={props.searchPanelIsOpened}

                        arrayFilteredStocksList={props.arrayFilteredStocksList}
                        latestStockCompanyInfo={props.latestStockCompanyInfo}
                        marketInfoList={props.marketInfoList}

                        clickedRecentlyViewedStock={props.clickedRecentlyViewedStock}
                    />
                </TabsBody>
            </Tabs>
        </div>);
}
