
import React from "react";
import { Chip, ListItem, ListItemPrefix, ListItemSuffix } from "@material-tailwind/react";

export default function ItemPanel(props: any) {
    // console.log(`%ItemPanel`, `color : white; background : blue`);
    // console.log(`[ItemPanel] props`, props);
    const ncavList: any = props.ncavList;

    let jsonSearchResult: any = { '종목명': '-', 'stock_code': '-', '종가': 0, '유동자산': 0, '부채총계': 0, '당기순이익': 0, '거래량': 0, '시가총액': 1, '상장주식수': 1/*divide by zero 방지용*/, ...ncavList[props.ticker] };
    let fairPrice/*적정가*/: number = Number(Number((Number(jsonSearchResult['유동자산']) - Number(jsonSearchResult['부채총계'])) / Number(jsonSearchResult['상장주식수'])).toFixed(0));
    let ratio = Number(fairPrice / Number(jsonSearchResult['종가']));
    if (isNaN(ratio)) {
        ratio = 0;
    }

    const CustomDiv = (props: any) => {
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
        const bgColor = (-1 === index) ? '' : 'bg-blue-700';
        const titleTextColor = (-1 === index) ? 'text-gray-700' : 'text-white';
        const itemTextColor = (-1 === index) ? 'text-black' : 'text-white';
        let item = props.item;
        if (false == isNaN(props.item)) {
            // item = Number(item).toFixed(3);
            // item = Util.UnitConversion(item, true);
        }

        return (
            <ListItem className={`p-0 px-1 m-0 mx-1 w-11/12 rounded-full border-b-2 border-gray-200 ${bgColor}`}>
                <ListItemPrefix className="p-0 pl-1 m-0">
                    <Chip className={`text-xs m-0 p-0 border-none ${titleTextColor}`} variant="outlined" value={props.title} />
                </ListItemPrefix>
                <ListItemSuffix className="p-0 pr-1 my-0">
                    <Chip className={`text-xs m-0 p-0 border-none ${itemTextColor}`} variant="outlined" value={item} />
                </ListItemSuffix>
            </ListItem>
        );
    }

    return (
        <div className={`z-10 w-full`}>
            <Chip className="w-fit border-none text-black text-md pb-0 my-0" variant="outlined" value={jsonSearchResult['종목명']} />
            <Chip className="border-none text-black text-2xl b-0 py-0 m-0" variant="outlined" value={`${Number(jsonSearchResult['종가']).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`} />
            <div className={`grid grid-cols-2 pr-1`}>
                {Object.keys(jsonSearchResult).map((key, index) => <CustomDiv key={index} title={key} item={jsonSearchResult[key]} />)}
            </div>
        </div>
    );
}
