
import React from "react";
import { Chip, ListItem, ListItemPrefix, ListItemSuffix } from "@material-tailwind/react";
import { useAppSelector } from "@/lib/hooks";

import { selectNcavList } from "@/lib/features/strategy/strategySlice";

export default function SearchPanel(props) {
    console.log(`[SearchPanel] props`, props);
    const ncavList: object = useAppSelector(selectNcavList);
    console.log(`[SearchPanel] ncavList`, ncavList);
    // console.log(`%cSearchPanel`, `color : white; background : blue`);

    let jsonSearchResult = { '종목명': '-', 'stock_code': '-', '종가': 0, '유동자산': 0, '부채총계': 0, '당기순이익': 0, '거래량': 0, '시가총액': 1, '상장주식수': 1/*divide by zero 방지용*/, ...ncavList[props.ticker] };
    // console.log(`jsonSearchResult['종목명']`, jsonSearchResult['종목명']);
    let fairPrice/*적정가*/: number = Number(Number((Number(jsonSearchResult['유동자산']) - Number(jsonSearchResult['부채총계'])) / Number(jsonSearchResult['상장주식수'])).toFixed(0));
    let ratio = Number(fairPrice / Number(jsonSearchResult['종가']));
    if (isNaN(ratio)) {
        ratio = 0;
    }

    const CustomDiv = (props) => {
        let index = String(props.item).indexOf('-');
        if (-1 === index) {
            if ("전 분기 적자" === props.item) {
                index = 0;
            }
            else if ("자본금 누락" == props.item) {
                index = 0;
            }
            else if ("이익잉여금 누락" == props.item) {
                index = 0;
            }
            else if ("자본 줄어드는 중" == props.item) {
                index = 0;
            }
        }
        // console.log(`index`, index);
        const bgColor = (-1 === index) ? '' : 'bg-blue-700';
        const titleTextColor = (-1 === index) ? 'text-gray-700' : 'text-white';
        const itemTextColor = (-1 === index) ? 'text-black' : 'text-white';
        return (
            <ListItem className={`p-0 px-1 m-0 mx-1 w-11/12 rounded-full border-b-2 border-gray-200 ${bgColor}`}>
                <ListItemPrefix className="p-0 pl-1 m-0">
                    <Chip className={`text-xs m-0 p-0 border-none ${titleTextColor}`} variant="outlined" value={props.title} />
                </ListItemPrefix>
                <ListItemSuffix className="p-0 pr-1 my-0">
                    <Chip className={`text-sm m-0 p-0 border-none ${itemTextColor}`} variant="outlined" value={props.item} />
                </ListItemSuffix>
            </ListItem>
        );
    }

    // console.log(`props.searchPanelIsOpened`, props.searchPanelIsOpened);

    // console.log(`props.stocksOfInterestPanelOpened`, props.stocksOfInterestPanelOpened);
    // console.log(`jsonSearchResult`, jsonSearchResult);
    return (
        <div className={`z-10 w-full`}>
            <Chip className="w-fit border-none text-black text-md pb-0 my-0" variant="outlined" value={jsonSearchResult['종목명']} />
            <Chip className="border-none text-black text-2xl b-0 py-0 m-0" variant="outlined" value={`${Number(jsonSearchResult['종가']).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`} />
            {/* <CustomChart
                fairPrice={fairPrice}
                tickerName={jsonSearchResult['종목명']}
                bsnsFullDate={(Object.keys(jsonSearchResult).length > 0) ? jsonSearchResult.bsnsDate : '-'}

                marketCapitalization={jsonSearchResult['시가총액']}
                listedStocks={jsonSearchResult['상장주식수']}
                marketInfoList={props.marketInfoList}

                responsive={true}
                display={false}
                height={'60px'}
                width={'90px'}
            /> */}
            <div className={`grid grid-cols-2 pr-1`}>
                {/* {Object.keys(selectedSearchResult).map((key, index) => <CustomDiv key={index} title={key} item={selectedSearchResult[key]} />)} */}
            </div>
        </div>
    );
}
