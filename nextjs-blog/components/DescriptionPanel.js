import { Button, Tab, Tabs, TabsHeader, TabsBody, TabPanel, ListItem, ListItemSuffix, ListItemPrefix, Typography } from "@material-tailwind/react";
import CustomCard from "./CustomCard";
import { strategyNCAV, strategyExample } from "../components/Strategy.js";
import TablePanel from "./TablePanel";

export default function DescriptionPanel(props) {
    // console.log(`%c DescriptionPanel`, `color:blue; background:white`);

    // console.log(`DescriptionPanel`, props.searchingList);
    if (props.searchPanelIsOpened) return <></>;

    function handleChange(selected) {
        switch (selected) {
            case 'ncav':
                props.setDictFilteredStockCompanyInfo(strategyNCAV(props.latestStockCompanyInfo));
                props.setStrategyInfo({ title: 'NCAV 전략', description: '"순유동자산 > 시가총액" 인 종목 추천합니다.' });
                break;
            case '저평가소형주':
                props.setDictFilteredStockCompanyInfo(strategyExample(props.latestStockCompanyInfo));
                props.setStrategyInfo({ title: '소형주 + 저PER + 저PBR', description: '저평가소형주' });
                break;
        }

        props.setSelectedStrategy(selected);
    }

    const data = [
        {
            label: 'NCAV',
            value: 'ncav',
            desc: `"순유동자산(= 유동자산 - 부채총계)"이 "시가총액"을 넘어선 기업을 선정합니다. 이러한 기업은 안정성과 재무 건전성 면에서 우수하며, 투자자들에게 안전하고 안정적인 투자 기회를 제공할 수 있습니다. 그러나 투자는 항상 리스크를 동반하므로 신중한 분석이 필요하며 전문가의 조언을 검토하는 것을 권장합니다.`
        },
        {
            label: '소형주+저PBR+저PER',
            value: '저평가소형주',
            desc: "저평가된 소형주 투자를 고려하는 퀀트 전략 중 하나로, 낮은 PBR (주가순자산가치비율)와 낮은 PER (주가이익비율)을 가진 종목을 탐색합니다. 이러한 종목은 현재 시장가치 대비 자산 및 수익이 낮게 평가되어 있을 가능성이 높아, 잠재적으로 미래 성장과 가치 상승의 기회를 제공할 수 있습니다. 하지만, 투자는 항상 리스크를 동반하므로 신중한 연구와 다양한 요인을 고려하는 것이 중요합니다."
        }
    ]
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
                        {data.map(({ value, desc }) => (
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
                        />
                    </TabsBody>
                </Tabs>
                {/* <CustomCard title={title} description={description} /> */}
            </div>
        </div>
    );
};