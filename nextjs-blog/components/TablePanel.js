
import { Card, CardBody, CardHeader, Chip, IconButton, List, ListItem, ListItemPrefix, ListItemSuffix, Popover, PopoverContent, PopoverHandler, Typography } from "@material-tailwind/react";
import CustomCard from "./CustomCard";
import Loading from "./Loading";
import { Util } from "./Util";

const MarQueue2 = (props) => {
    const CardList = () => {
        return (
            <>
                {props.contents.map((content, index) => <CustomCard key={index} title={content.title} description={content.description} textColor={content.textColor} backGround={content.backGround} />)}
            </>
        );
    };

    return (
        <div className='relative flex overflow-x-hidden'>
            <div className='flex animate-marquee whitespace-nowrap'>
                <CardList />
            </div>
            <div className='flex absolute animate-marquee2 whitespace-nowrap'>
                <CardList />
            </div>
        </div>
    );
}

const ListNode = (props) => {
    const diffRatio = (((Number((props.close).replace(/,/g, '')) / Number((props.prevClose).replace(/,/g, ''))) - 1) * 100).toFixed(1);
    const percentCompareFirst = (props.ratio - 100) >= 100 ? true : false;
    const percentCompareSecond = (props.ratio - 100) >= 50 ? true : false;
    const selectedColorByRatio = percentCompareFirst ? 'red' : (percentCompareSecond ? 'yellow' : 'blue');

    return (
        <ListItem className="p-0 border-b-2" onClick={() => { props.clickedRecentlyViewedStock(props.tickerName) }}>
            <ListItemPrefix className="mr-2 w-24">
                <Chip className="border-none" size="sm" variant="outlined" value={"목표가"} />
                <Chip className="border-none py-0" size="sm" variant="outlined" color={selectedColorByRatio} value={props.fairPrice + "원 (" + (props.ratio - 100) + "%)"} />
            </ListItemPrefix>
            <div>
                <Typography className="ml-3" variant="h6">{props.tickerName}</Typography>
            </div>
            <ListItemSuffix>
                <Chip className="border-none text-lg p-0 text-right" variant="outlined" size="lg" value={diffRatio + "%"} color={diffRatio > 0 ? 'red' : 'blue'} />
                <Chip className="border-none py-0" variant="outlined" size="sm" value={props.close + "원"} />
            </ListItemSuffix>
        </ListItem >
    );
};

//////////////////////////////////////////////////////////////////////////////
// Table
export default function TablePanel(props) {
    console.log(`%c TablePanel`, `color:blue; background:white`);

    let loadingDone = true;
    props.marketInfoList.forEach((obj) => loadingDone &&= !!obj);

    if (false === loadingDone) return <Loading />;

    // console.log(`%c TablePanel 2`, `color:blue; background:white`);

    const NUM_OF_STOCK_ITEMS = props.arrayFilteredStocksList.length;
    if (0 == NUM_OF_STOCK_ITEMS) return <Loading />;

    // console.log(`%c TablePanel 3`, `color:blue; background:white`);

    let cumulativeRatio = 0;

    let tbody = [];
    let index = 0;

    // console.log(`1-1) props.arrayFilteredStocksList`, props.arrayFilteredStocksList);
    // console.log(`1-2) props.arrayFilteredStocksList.length`, props.arrayFilteredStocksList.length);
    // console.log(`2-1) props.latestStockCompanyInfo`, props.latestStockCompanyInfo);
    // console.log(`2-2) Object.keys(props.latestStockCompanyInfo).length`, Object.keys(props.latestStockCompanyInfo).length);
    // console.log(`3-1) props.marketInfoList`, props.marketInfoList);
    // console.log(`3-2) Object.keys(props.marketInfoList).length`, Object.keys(props.marketInfoList).length);

    for (let stockName of props.arrayFilteredStocksList) {
        const { corp_code, active, 종목명, 유동자산, 부채총계, 상장주식수, 종가, 당기순이익, 시가총액, PER, PBR, EPS, bsnsDate, prevMarketInfo } = props.latestStockCompanyInfo[stockName];
        const fairPrice/*적정가*/ = Number((Number(유동자산) - Number(부채총계)) / Number(상장주식수)).toFixed(0);
        const ratio = Number(fairPrice / Number(종가));

        cumulativeRatio += ratio;

        tbody.push({
            key: parseInt(corp_code).toString(),
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
            close: Number(종가).toLocaleString(),
            bsnsFullDate: bsnsDate,

            listedStocks: 상장주식수,
            marketInfoList: props.marketInfoList,

            // prev
            prevBsnsFullDate: prevMarketInfo.bsnsDate,
            prevClose: Number(prevMarketInfo.종가).toLocaleString()

        });

        ++index;
    }

    const LATEST_MARKET_INFO_INDEX = props.marketInfoList.length - 1;

    const 기대수익 = `${Number((cumulativeRatio / NUM_OF_STOCK_ITEMS - 1) * 100).toFixed(1)}%`;
    const prevBsnsDate = props.marketInfoList[LATEST_MARKET_INFO_INDEX - 1].date;
    const bsnsDate = props.marketInfoList[LATEST_MARKET_INFO_INDEX].date;

    const thstrm_dt = props.latestStockCompanyInfo[Object.keys(props.latestStockCompanyInfo)[0]].thstrm_dt;

    tbody.sort((a, b) => { return b.weight - a.weight; });

    return (
        <>
            {props.marqueueDisplay === true ?
                <MarQueue2 contents={[
                    { title: `추천 종목수`, description: `${NUM_OF_STOCK_ITEMS} 개` },
                    { title: `목표수익률`, description: 기대수익, textColor: `text-black`, backGround: `` },
                    { title: `이전 주가 일자`, description: `${prevBsnsDate}`, textColor: `text-black`, backGround: `bg-amber-200` },
                    { title: `최근 주가 일자`, description: `${bsnsDate}`, textColor: `text-black`, backGround: `bg-blue-200` },
                    { title: `재무정보 일자`, description: `${thstrm_dt}` },
                ]} />
                : <></>
            }
            <Card className="w-full z-10 overflow-y-auto h-screen">
                <List className="px-0 mt-0">
                    {(tbody.length > 0) ? tbody.map((item) => <ListNode key={item.key} {...item} />) : <></>}
                </List>
            </Card>
        </>
    );
};