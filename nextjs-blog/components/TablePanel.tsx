
import { Card, Chip, List, ListItem, ListItemPrefix, ListItemSuffix, Typography } from "@material-tailwind/react";
import { Util } from "./Util";
import CustomCard from "@/components/CustomCard";
import Loading from "@/components/Loading";
import Link from "next/link";

const MarQueue2 = (props) => {
    const CardList = () => {
        return (
            <>
                {props.contents.map((content, index) => <CustomCard key={index} title={content.title} description={content.description} textColor={content.textColor} backGround={content.backGround} />)}
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

const ListNodeTemplate = (props) => {
    return (
        <Link href={props.link}>
            <ListItem className={`p-0 border-b-2 ${props.bgColor}`}>
                <ListItemPrefix>
                    <Typography className="ml-3 pl-4" variant="h6">{props.item1}</Typography>
                </ListItemPrefix>
                <ListItemSuffix>
                    <Chip className="border-none py-0 pr-2" size="sm" variant="outlined" value={props.item2} />
                </ListItemSuffix>
                <div className="mr-2 w-3">
                    <Chip className="border-none py-0" size="sm" variant="outlined" value={props.item3} />
                </div>
                <div className="mr-2 w-28">
                    <Chip className="border-none py-0" size="sm" variant="outlined" color={props.color} value={props.item4} />
                </div>
            </ListItem >
        </Link>
    );
}
const ListNode = (props) => {
    const percentCompareFirst = (props.ratio - 100) >= 100 ? true : false;
    const percentCompareSecond = (props.ratio - 100) >= 50 ? true : false;
    const selectedColorByRatio = percentCompareFirst ? 'red' : (percentCompareSecond ? 'yellow' : 'blue');

    return (
        <ListNodeTemplate
            link={`/ticker/${props.tickerName}`}
            item1={props.tickerName}
            item2={props.close + "원"}
            item3={"➡️"}
            item4={props.fairPrice + "원 (" + (props.ratio - 100) + "%)"}
            color={selectedColorByRatio}
        />
    );
};

//////////////////////////////////////////////////////////////////////////////
// Table
export default function TablePanel(props) {
    // console.log(`%c TablePanel`, `color:blue; background:white`);

    // let loadingDone = true;
    // props.marketInfoList.forEach((obj) => loadingDone &&= !!obj);

    // if (false === loadingDone) return <Loading />;

    const NUM_OF_STOCK_ITEMS = props.arrayFilteredStocksList.length;
    if (0 == NUM_OF_STOCK_ITEMS) return <Loading />;

    let cumulativeRatio = 0;

    let tbody: any = [];
    let index = 0;

    for (let stockName of props.arrayFilteredStocksList) {
        // console.log(`stockName`, stockName);
        // console.log(props.latestStockCompanyInfo[stockName]);
        if (undefined == props.latestStockCompanyInfo[stockName]) {
            continue; // TODO : 임시 code. undefined 인 이유 확인하고 다시 code 수정 필요.
        }

        const { corp_code, active, 종목명, 유동자산, 부채총계, 상장주식수, 종가, 당기순이익, 시가총액, PER, PBR, EPS, bsnsDate, prevMarketInfo } = props.latestStockCompanyInfo[stockName];
        const fairPrice/*적정가*/: number = Number(Number((Number(유동자산) - Number(부채총계)) / Number(상장주식수)).toFixed(0));

        const 상장폐지 = (!!!상장주식수); // undefined
        if (true === 상장폐지) {
            continue;
        }

        const ratio = Number(fairPrice / Number(종가));

        cumulativeRatio += ratio;

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
            currentAssets: Util.UnitConversion(유동자산),
            liabilities: Util.UnitConversion(부채총계),
            netIncome: Util.UnitConversion(당기순이익),
            marketCapitalization: Util.UnitConversion(시가총액),

            PER: Number(PER),
            PBR: Number(PBR),
            EPS: Number(EPS),
            bsnsFullDate: bsnsDate,

            listedStocks: 상장주식수,
            marketInfoList: props.marketInfoList,

            // // prev
            // prevBsnsFullDate: prevMarketInfo.bsnsDate,
            // prevClose: Number(prevMarketInfo.종가).toLocaleString()

        });

        ++index;
    }

    const LATEST_MARKET_INFO_INDEX = props.marketInfoList.length - 1;

    const 기대수익 = `${Number((cumulativeRatio / NUM_OF_STOCK_ITEMS - 1) * 100).toFixed(1)}%`;
    // const prevBsnsDate = props.marketInfoList[LATEST_MARKET_INFO_INDEX - 1].date;
    // const prevBsnsDate = "99999999";
    // const bsnsDate = props.marketInfoList[LATEST_MARKET_INFO_INDEX].date;
    const bsnsDate = props.bsnsDate;

    const thstrm_dt = props.latestStockCompanyInfo[Object.keys(props.latestStockCompanyInfo)[0]].thstrm_dt;

    tbody.sort((a, b) => { return b.weight - a.weight; });

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
                : <></>
            }
            <Card className="w-full z-0 overflow-y-auto h-screen">
                <List className="px-0">
                    <ListNodeTemplate
                        link={`/`}
                        item1={"종목명"}
                        item2={"현재가"}
                        item3={"➡️"}
                        item4={"목표가"}
                        color={"blue"}
                        bgColor={"bg-gray-200"}
                    />
                    {(tbody.length > 0) ? tbody.map((item: any, index: any) => <ListNode key={index} {...item} />) : <></>}
                </List>
                <div className="pb-32" />
            </Card>
        </>
    );
};