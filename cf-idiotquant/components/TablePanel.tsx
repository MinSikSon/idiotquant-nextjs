
import { Button, Card, Chip, List, Spinner, Typography } from "@material-tailwind/react";
import { Util } from "./util";
import CustomCard from "@/components/CustomCard";
import Link from "next/link";
import { getChangedTicker } from "./tickerMapper";
import { usePathname } from "next/navigation";

const MarQueue2 = (props: any) => {
    const CardList = () => {
        return (
            <>
                {props.contents.map((content: any, index: any) => <CustomCard key={index} title={content.title} description={content.description} textColor={content.textColor} backGround={content.backGround} />)}
            </>
        );
    };

    return (
        <div className='relative z-10 top-0 flex overflow-x-hidden'>
            <div className='flex animate-marquee whitespace-nowrap'>
                <CardList />
            </div>
            <div className='flex absolute animate-marquee2 whitespace-nowrap'>
                <CardList />
            </div>
        </div>
    );
}

export const ListNodeTemplate = (props: any) => {
    return (
        <Link href={props.link}>
            <List.Item className={`p-0 border-b-2 ${props.bgColor}`}>
                <List.ItemStart>
                    <Chip className="border-none py-0" size="sm" variant="outline">
                        <Chip.Label>{props.item1}</Chip.Label>
                    </Chip>
                </List.ItemStart>
                <List.ItemEnd>
                    <Chip className="border-none py-0 pr-2" size="sm" variant="outline">
                        <Chip.Label>{props.item2}</Chip.Label>
                    </Chip>
                </List.ItemEnd>
                <div className="mr-2 w-3">
                    <Chip className="border-none py-0" size="sm" variant="outline">
                        <Chip.Label>{props.item3}</Chip.Label>
                    </Chip>
                </div>
                <div className="mr-2 w-28">
                    <Chip className="border-none py-0" size="sm" variant="outline" color={props.color}>
                        <Chip.Label>{props.item4}</Chip.Label>
                    </Chip>
                </div>
                {!!props.item5 ? <div className="mr-2 w-16">
                    <Chip className="border-none py-0" size="sm" variant="outline">
                        <Chip.Label>{props.item5}</Chip.Label>
                    </Chip>
                </div> : <></>}
            </List.Item >
        </Link>
    );
}
const ListNode = (props: any) => {
    const percentCompareFirst = (props.ratio - 100) >= 100 ? true : false;
    const percentCompareSecond = (props.ratio - 100) >= 50 ? true : false;
    const selectedColorByRatio = percentCompareFirst ? 'red' : (percentCompareSecond ? 'yellow' : 'blue');

    let close = props.close;
    // console.log(`[ListNode] props.endMarketInfo`, props.endMarketInfo);
    let endClosePrice: any = undefined;
    if (!!props.endMarketInfo) {
        endClosePrice = !!props.endMarketInfo[`종가`] ? `${props.endMarketInfo[`종가`]} 원` : `-`;

        // console.log(`props.endMarketInfo`, props.endMarketInfo);
        // console.log(`props.marketCapitalization`, props.marketCapitalization);

        // NOTE: endMarketInfo 시점에 종가 맞춤 (액면분할 했을 수 있기 때문)
        close = Number(props.marketCapitalization / props.endMarketInfo[`상장주식수`]).toFixed(0);
    }

    return (
        <ListNodeTemplate
            link={`/${props.pathname}/${props.tickerName}`}
            item1={props.tickerName}
            item2={close + "원"}
            item3={"➡️"}
            item4={props.fairPrice + "원 (" + (props.ratio - 100) + "%)"}
            color={selectedColorByRatio}
            item5={endClosePrice}
        />
    );
};

//////////////////////////////////////////////////////////////////////////////
// Table
export default function TablePanel(props: any) {
    // console.log(`%c TablePanel`, `color:blue; background:white`);

    const stockNameList = Object.keys(props.filteredStocks);

    // console.log(`[TablePanel] pathname`, props.pathname, stockNameList);

    const NUM_OF_STOCK_ITEMS = stockNameList.length;
    if (0 == NUM_OF_STOCK_ITEMS) {
        return <Button variant="solid" className="font-mono"><Spinner size="sm" />{props.loadingMsg}</Button>
    }

    let cumulativeRatio = 0;

    let realStockCount = 0;
    let cumulativeRealRatio = 0;

    let tbody: any = [];
    let index = 0;

    for (let stockName of stockNameList) {
        if (undefined == props.filteredStocks[stockName]) {
            continue; // TODO : 임시 code. undefined 인 이유 확인하고 다시 code 수정 필요.
        }

        const { corp_code, active, 종목명, 유동자산, 부채총계, 상장주식수, 종가, 당기순이익, 시가총액, PER, PBR, EPS, bsnsDate, prevMarketInfo } = props.filteredStocks[stockName];
        const fairPrice/*적정가*/: number = Number(Number((Number(유동자산) - Number(부채총계)) / Number(상장주식수)).toFixed(0));

        const 상장폐지 = (!!!상장주식수); // undefined
        if (true === 상장폐지) {
            continue;
        }

        const ratio = Number(fairPrice / Number(종가));

        cumulativeRatio += ratio;

        let endMarketInfo: any = null;
        if (!!props.endMarketInfo) {
            endMarketInfo = props.endMarketInfo[`data`][종목명];
            // changed Ticker Check
            if (!!endMarketInfo) {
                endMarketInfo = props.endMarketInfo[`data`][getChangedTicker(종목명)];
            }

            endMarketInfo = !!endMarketInfo ? endMarketInfo : `-`;

            if (`-` != endMarketInfo) {
                let closeBasedEndMarketInfo = 시가총액 / endMarketInfo[`상장주식수`];
                endMarketInfo[`상장주식수`];
                // endMarketInfo[`시가총액`];
                cumulativeRealRatio += (((endMarketInfo[`종가`] / closeBasedEndMarketInfo) - 1));
                realStockCount++;
            }
        }

        tbody.push({
            // key: parseInt(corp_code).toString(),
            corpCode: parseInt(corp_code),
            clickedRecentlyViewedStock: props.clickedRecentlyViewedStock,

            active: active,
            tickerName: 종목명,
            index: index,
            ratio: Number(ratio * 100).toFixed(0),
            close: Number(종가).toLocaleString(),
            fairPrice: Number(fairPrice).toLocaleString(),
            currentAssets: Util.UnitConversion(유동자산, false),
            liabilities: Util.UnitConversion(부채총계, false),
            netIncome: Util.UnitConversion(당기순이익, false),
            // marketCapitalization: Util.UnitConversion(시가총액),
            marketCapitalization: 시가총액,

            PER: Number(PER),
            PBR: Number(PBR),
            EPS: Number(EPS),
            bsnsFullDate: bsnsDate,

            listedStocks: 상장주식수,
            marketInfoList: props.filteredStocks,
            endMarketInfo: endMarketInfo,

            // // prev
            // prevBsnsFullDate: prevMarketInfo.bsnsDate,
            // prevClose: Number(prevMarketInfo.종가).toLocaleString()

        });

        ++index;
    }

    const 기대수익 = `${Number((cumulativeRatio / NUM_OF_STOCK_ITEMS - 1) * 100).toFixed(1)}%`;
    const 실수익 = ((cumulativeRealRatio / realStockCount) * 100).toFixed(1) + '%';
    const bsnsDate = props.bsnsDate;
    const thstrm_dt = props.filteredStocks[Object.keys(props.filteredStocks)[0]].thstrm_dt;

    tbody.sort((a: any, b: any) => { return b.weight - a.weight; });

    console.log(`TODO: 필터기능 추가`);
    return (
        <>
            {props.marqueueDisplay === true ?
                <MarQueue2 contents={[
                    { title: `추천 종목수`, description: `${NUM_OF_STOCK_ITEMS} 개` },
                    { title: `목표수익률`, description: 기대수익, textColor: `text-black`, backGround: `` },
                    // { title: `이전 주가 일자`, description: `${prevBsnsDate}`, textColor: `text-black`, backGround: `bg-amber-200` },
                    { title: `최근 주가 일자`, description: `${bsnsDate}`, textColor: `text-black`, backGround: `bg-blue-200` },
                    { title: `재무정보 일자`, description: `${thstrm_dt}` },
                ]} />
                : <>
                    <div className="flex w-full">
                        <Chip className="w-1/2" variant="outline" size="sm">
                            <Chip.Label>재무정보 일자: {thstrm_dt}</Chip.Label>
                        </Chip>
                    </div>
                    <div className="flex w-full">
                        <Chip className="w-1/2" variant="outline" size="sm">
                            <Chip.Label>최근 주가 일자: {bsnsDate}</Chip.Label>
                        </Chip>
                        <Chip className="w-1/2" variant="outline" size="sm">
                            <Chip.Label>최근 주가 일자: {(props.endDate).split(`_`)[1]}</Chip.Label>
                        </Chip>
                    </div>
                    <div className="flex w-full">
                        <Chip className="w-1/2" variant="outline" size="sm">
                            <Chip.Label>추천 종목수: {NUM_OF_STOCK_ITEMS} 개</Chip.Label>
                        </Chip>
                    </div>
                    <div className="flex w-full">
                        <Chip className="w-1/2" variant="outline" size="sm">
                            <Chip.Label>목표수익률: {기대수익}</Chip.Label>
                        </Chip>
                        <Chip className="w-1/2" variant="outline" size="sm">
                            <Chip.Label>실수익률: {실수익}</Chip.Label>
                        </Chip>
                    </div>
                </>
            }
            <Card className="w-full z-0 overflow-y-auto h-screen">
                <List className="px-0">
                    {props.listHeader}
                    {(tbody.length > 0) ? tbody.map((item: any, index: any) => <ListNode key={index} {...item} pathname={props.pathname} />) : <></>}
                </List>
            </Card>
        </>
    );
};