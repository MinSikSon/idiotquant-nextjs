import { Button, Tab, Tabs, TabsHeader, TabsBody, TabPanel, ListItem, ListItemSuffix, ListItemPrefix, Typography } from "@material-tailwind/react";
import CustomCard from "./CustomCard";
import { strategyNCAV, strategyExample } from "../components/Strategy.js";
import TablePanel from "./TablePanel";

export default function DescriptionPanel(props) {
    // console.log(`%c DescriptionPanel`, `color:blue; background:white`);
    // console.log(`DescriptionPanel`, props.searchingList);

    if (props.searchPanelIsOpened) return <></>;

    function handleChange(selected) {
        let strategy = '';
        let strategyInfo = ''

        switch (selected) {
            case 'ncav':
                strategy = strategyNCAV(props.latestStockCompanyInfo);
                strategyInfo = { title: 'NCAV 전략', description: '"순유동자산 > 시가총액" 인 종목 추천합니다.' };
                break;
            case '저평가소형주':
                strategy = strategyExample(props.latestStockCompanyInfo);
                strategyInfo = { title: '소형주 + 저PER + 저PBR', description: '저평가소형주' }
                break;
            default:
                strategy = 'custom';
                strategyInfo = { title: 'custom_title', description: 'custom_desc' };
                break;
        }

        props.setDictFilteredStockCompanyInfo(strategy);
        props.setStrategyInfo(strategyInfo);
        props.setSelectedStrategy(selected);
    }

    return (
        <div className='py-3 my-2 bg-white'>
            <Typography className="pl-5 pb-2" variant='h6'>관심 주식</Typography>
            <div className='bg-white'>
                <Tabs value="ncav">
                    <ListItem className="p-0 pl-5">
                        <TabsHeader
                            className="overflow-x-scroll rounded-none border-b border-blue-gray-100 bg-transparent p-0"
                            indicatorProps={{ className: "bg-transparent border-b-2 border-gray-900 shadow-none rounded-none", }}
                        >
                            {props.stocksOfInterest.map(({ label, value }) => (
                                <Tab className="shrink-0 w-fit text-sm" onClick={() => handleChange(value)} key={value} value={value}>
                                    {label}
                                </Tab>
                            ))}
                        </TabsHeader>

                        <ListItemSuffix className="shrink-0 w-fit">
                            {/* <Button disabled className="border-l-2 p-0 px-1 mx-1 rounded-none text-sm" variant="text" onClick={() => props.handleClickStocksOfInterestButton()}>편집</Button> */}
                            <Button className="border-l-2 p-0 px-1 mx-1 rounded-none text-sm" variant="text" onClick={() => props.handleClickStocksOfInterestButton()}>편집</Button>
                        </ListItemSuffix>
                    </ListItem>
                    <TabsBody>
                        {props.stocksOfInterest.map(({ value, desc }) => (
                            <TabPanel key={value} value={value} className="text-sm text-black">
                                {desc}
                            </TabPanel>
                        ))}
                        <TablePanel
                            // func
                            setSearchPanelIsOpened={props.setSearchPanelIsOpened}

                            searchPanelIsOpened={props.searchPanelIsOpened}

                            dictFilteredStockCompanyInfo={props.dictFilteredStockCompanyInfo}
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