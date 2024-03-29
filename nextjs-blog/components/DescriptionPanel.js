import { Button, Tab, Tabs, TabsHeader, TabsBody, TabPanel, ListItem, ListItemSuffix, ListItemPrefix, Typography } from "@material-tailwind/react";
import TablePanel from "./TablePanel";

export default function DescriptionPanel(props) {
    // console.log(`%c DescriptionPanel`, `color:blue; background:white`);
    // console.log(`props.openedPanel`, props.openedPanel);

    if ('' !== props.openedPanel) return <></>;
    if (!!!props.stocksOfInterest.tabs) return <></>;

    return (
        <div className='py-3 my-2'>
            <Typography className="pl-5 pb-2" variant='h6'>관심 주식</Typography>
            <div>
                <Tabs value={props.stocksOfInterest.tabs[props.selectedStocksOfInterestTab].value}>
                    <TabsHeader
                        className="flex rounded-none border-b border-blue-gray-100 bg-transparent p-0"
                        indicatorProps={{ className: "bg-transparent border-b-2 border-gray-900 shadow-none rounded-none", }}>
                        <div className="overflow-x-scroll w-10/12 flex">
                            {props.stocksOfInterest.tabs.map(({ label, value }, idx) => (
                                <Tab className={`shrink-0 w-fit text-sm rounded-t`}
                                    onClick={() => props.handleStocksOfInterestChange(value)}
                                    key={value}
                                    value={value}>
                                    {label}
                                </Tab>
                            ))}
                        </div>
                        <Button
                            className="w-2/12 text-sm shrink-0 p-2 mr-1 self-center"
                            color="blue"
                            onClick={(e) => {
                                e.preventDefault();
                                props.handleClickStocksOfInterestButton()
                            }}>편집</Button>
                    </TabsHeader>
                    <TabsBody>
                        {props.stocksOfInterest.tabs.map(({ value, desc }, idx) => (
                            <TabPanel key={idx} value={value} className="text-sm text-black">
                                {desc}
                            </TabPanel>
                        ))}
                        <TablePanel
                            marqueueDisplay={true}

                            searchPanelIsOpened={props.searchPanelIsOpened}

                            arrayFilteredStocksList={props.arrayFilteredStocksList}
                            latestStockCompanyInfo={props.latestStockCompanyInfo}
                            marketInfoList={props.marketInfoList}

                            clickedRecentlyViewedStock={props.clickedRecentlyViewedStock}
                        />
                    </TabsBody>
                </Tabs>
            </div>
        </div>
    );
};
