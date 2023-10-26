import { Button, Tab, Tabs, TabsHeader, TabsBody, TabPanel, ListItem, ListItemSuffix, ListItemPrefix, Typography } from "@material-tailwind/react";
import CustomCard from "./CustomCard";
import { strategyNCAV, strategyExample } from "../components/Strategy.js";
import TablePanel from "./TablePanel";

export default function DescriptionPanel(props) {
    console.log(`%c DescriptionPanel`, `color:blue; background:white`);

    if (props.openSearchResult) return <></>;

    function handleChange(selected) {
        console.log(`handleChange`, selected);
        switch (selected) {
            case 'ncav':
                props.setDictFilteredStockCompanyInfo(strategyNCAV(props.latestStockCompanyInfo));
                props.setStrategyInfo({ title: 'NCAV 전략', description: '"순유동자산 > 시가총액" 인 종목 추천합니다.' });
                break;
            case 'test':
                props.setDictFilteredStockCompanyInfo(strategyExample(props.latestStockCompanyInfo));
                props.setStrategyInfo({ title: '소형주 + 저PER + 저PBR', description: 'TEST 중입니다' });
                break;
        }

        props.setSelectedStrategy(selected);
    }

    // TODO: 전략 현재는 2개, list 로 변경하고 추가/제거 할 수 있도록 변경 필요
    // list 유지되게 할 필요
    const { title, description } = props.strategyInfo;

    const data = [
        {
            label: 'NCAV',
            value: 'ncav',
            desc: 'NCAV'
        },
        {
            label: '소형주+저PBR+저PER',
            value: 'test',
            desc: '소형주 + 저 PBR + 저 PER'
        }
    ]
    return (
        <>
            <div className='py-3 my-2 bg-white sm:px-20 md:px-40 lg:px-64 xl:px-80 2xl:px-96'>
                <Typography className="pl-5 pb-2" variant='h6'>관심 주식</Typography>
                <div className='bg-white'>
                    <Tabs value="ncav">
                        <ListItem className="p-0 pl-5">
                            <TabsHeader
                                className="overflow-x-scroll rounded-none border-b border-blue-gray-100 bg-transparent p-0"
                                indicatorProps={{ className: "bg-transparent border-b-2 border-gray-900 shadow-none rounded-none", }}
                            >
                                {data.map(({ label, value }) => (
                                    <Tab className="shrink-0 w-fit text-sm" onClick={() => handleChange(value)} key={value} value={value}>
                                        {label}
                                    </Tab>
                                ))}
                            </TabsHeader>

                            <ListItemSuffix className="shrink-0 w-fit">
                                <Button disabled className="border-l-2 p-0 px-1 mx-1 rounded-none text-sm" variant="text">편집</Button>
                            </ListItemSuffix>
                        </ListItem>
                        <TabsBody>
                            {/* {data.map(({ value, desc }) => (
                                <TabPanel key={value} value={value}>
                                    {desc}
                                </TabPanel>
                            ))} */}
                            <TablePanel
                                searchStockCompanyInfo={props.searchStockCompanyInfo}
                                setOpenSearchResult={props.setOpenSearchResult}
                                openSearchResult={props.openSearchResult}

                                dictFilteredStockCompanyInfo={props.dictFilteredStockCompanyInfo}
                                searchResult={props.searchResult}

                                marketInfoList={props.marketInfoList}

                                deleteStockCompanyInList={props.deleteStockCompanyInList}
                            />
                        </TabsBody>
                    </Tabs>
                    {/* <CustomCard title={title} description={description} /> */}

                    {/* <TablePanel
                        searchStockCompanyInfo={props.searchStockCompanyInfo}
                        setOpenSearchResult={props.setOpenSearchResult}
                        openSearchResult={props.openSearchResult}

                        dictFilteredStockCompanyInfo={props.dictFilteredStockCompanyInfo}
                        searchResult={props.searchResult}

                        marketInfoList={props.marketInfoList}

                        deleteStockCompanyInList={props.deleteStockCompanyInList}
                    /> */}
                </div>
            </div>
        </>
    );
};