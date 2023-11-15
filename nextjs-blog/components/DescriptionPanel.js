import { Button, Tab, Tabs, TabsHeader, TabsBody, TabPanel, ListItem, ListItemSuffix, ListItemPrefix, Typography } from "@material-tailwind/react";
import CustomCard from "./CustomCard";
import TablePanel from "./TablePanel";

export default function DescriptionPanel(props) {
    // console.log(`%c DescriptionPanel`, `color:blue; background:white`);
    // console.log(`DescriptionPanel`, props.searchingList);

    if (props.searchPanelIsOpened) return <></>;

    return (
        <div className='py-3 my-2 bg-white'>
            <Typography className="pl-5 pb-2" variant='h6'>관심 주식</Typography>
            <div className='bg-white'>
                <Tabs value="ncav">
                    <TabsHeader
                        className="overflow-x-scroll rounded-none border-b border-blue-gray-100 bg-transparent p-0"
                        indicatorProps={{ className: "bg-transparent border-b-2 border-gray-900 shadow-none rounded-none", }}
                    >
                        <ListItem className="p-0 pl-5">
                            {props.stocksOfInterest.map(({ label, value }) => (
                                <Tab className="shrink-0 w-fit text-sm" onClick={() => props.handleStocksOfInterestChange(value)} key={value} value={value}>
                                    {label}
                                </Tab>
                            ))}
                            <ListItemSuffix className="shrink-0 w-fit">
                                {/* <Button disabled className="border-l-2 p-0 px-1 mx-1 rounded-none text-sm" variant="text" onClick={() => props.handleClickStocksOfInterestButton()}>편집</Button> */}
                                <Button
                                    className="border-l-2 p-0 px-1 mx-1 rounded-none text-sm"
                                    variant="text"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        props.handleClickStocksOfInterestButton()
                                    }}
                                >편집</Button>
                            </ListItemSuffix>
                        </ListItem>
                    </TabsHeader>
                    <TabsBody>
                        {props.stocksOfInterest.map(({ value, desc }) => (
                            <TabPanel key={value} value={value} className="text-sm text-black">
                                {desc}
                            </TabPanel>
                        ))}
                        <TablePanel
                            searchPanelIsOpened={props.searchPanelIsOpened}

                            dictFilteredStockCompanyInfo={props.dictFilteredStockCompanyInfo}
                            arrayFilteredStocksList={props.arrayFilteredStocksList}
                            latestStockCompanyInfo={props.latestStockCompanyInfo}
                            marketInfoList={props.marketInfoList}

                            deleteStockCompanyInList={props.deleteStockCompanyInList}

                            clickedRecentlyViewedStock={props.clickedRecentlyViewedStock}
                        />
                    </TabsBody>
                </Tabs>
                {/* <CustomCard title={title} description={description} /> */}
            </div>
        </div>
    );
};