
import { Card, Chip, IconButton, List, ListItem, ListItemPrefix, ListItemSuffix, Popover, PopoverContent, PopoverHandler, Typography } from "@material-tailwind/react";
import CustomCard from "./CustomCard";
import CustomChart from "./CustomChart";
import Loading from "./Loading";
import { Util } from "./Util";
import { TrashIcon } from "@heroicons/react/24/outline";

const MarQueue = (props) => {
    const CardList = () => {
        return (
            <>
                {props.contents.map((content, index) => <CustomCard key={index} title={content.title} description={content.description} textColor={content.textColor} backGround={content.backGround} />)}
            </>
        );
    };

    return (
        <div className='relative flex overflow-x-scroll'>
            <CardList />
        </div>
    );
}

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
    const diffRatio = ((1 - (Number((props.close).replace(/,/g, '')) / Number((props.prevClose).replace(/,/g, '')))) * 100).toFixed(1);
    const percentCompareFirst = (props.ratio - 100) >= 100 ? true : false;
    const percentCompareSecond = (props.ratio - 100) >= 50 ? true : false;
    const selectedColorByRatio = percentCompareFirst ? 'red' : (percentCompareSecond ? 'yellow' : 'blue');

    return (
        <Popover animate={{
            mount: { scale: 1, y: 0 },
            unmount: { scale: 0, y: 25 },
        }}>
            <PopoverHandler>
                <ListItem className="p-0 border-b-2">
                    <ListItemPrefix className="mr-2 w-24">
                        <Chip className="border-none" size="sm" variant="outlined" value={"목표가"} />
                        <Chip className="border-none" size="sm" variant="outlined" color={selectedColorByRatio} value={props.fairPrice + "원 (" + (props.ratio - 100) + "%)"} />

                    </ListItemPrefix>
                    <div>
                        {/* <Typography className="ml-3" variant={`${props.tickerName.length <= 5 ? 'h5' : 'h6'}`}>{props.tickerName}</Typography> */}
                        <Typography className="ml-3" variant="h5">{props.tickerName}</Typography>

                    </div>
                    <ListItemSuffix>
                        <Chip className="border-none text-lg p-0 text-right" variant="outlined" size="lg" value={diffRatio + "%"} color={diffRatio > 0 ? 'red' : 'blue'} />
                        <Chip className="border-none" variant="outlined" size="sm" value={props.close + "원"} />
                    </ListItemSuffix>
                </ListItem >
            </PopoverHandler>
            <PopoverContent className='flex items-center p-0'>
                <IconButton className='rounded-full' color="red" onClick={() => props.deleteStockCompanyInList(props.tickerName)}>
                    <TrashIcon className="h-6 w-6" />
                </IconButton>
                <div>
                    <div className='flex'>
                        <Chip size='sm' color='blue' value={"현재 주가:" + props.close + "원"} />
                        <Chip size='sm' color='blue' value={"이전 주가:" + props.prevClose + "원"} />
                        <Chip size='sm' color='pink' value={"목표 주가:" + props.fairPrice + "원"} />
                    </div>
                    <div className='flex'>
                        <Chip size='sm' color='green' value={"시가총액:" + props.marketCapitalization + "원"} />
                        <Chip size='sm' color='green' value={"상장주식수:" + Number(props.listedStocks).toLocaleString() + "개"} />
                    </div>
                    <div className='flex'>
                        <Chip size='sm' color='indigo' value={"유동자산:" + props.currentAssets + "원"} />
                        <Chip size='sm' color='amber' value={"부채총계:" + props.liabilities + "원"} />
                        <Chip size='sm' color='cyan' value={"당기순이익:" + props.netIncome + "원"} />
                    </div>
                    <div className='flex'>
                        <Chip size='sm' color='purple' value={"PER:" + props.PER} />
                        <Chip size='sm' color='purple' value={"PBR:" + props.PBR} />
                    </div>
                </div>
                {/* <CustomChart
                    tickerName={props.tickerName}
                    bsnsFullDate={props.bsnsFullDate}
                    fairPrice={props.fairPrice}

                    marketInfoList={props.marketInfoList}

                    responsive={false}
                    height={60}
                    width={90}
                    display={false}
                /> */}
            </PopoverContent>
        </Popover>
    );
};

//////////////////////////////////////////////////////////////////////////////
// Table
export default function Table(props) {
    // console.log(`%c[call] Table()`, `color : white; background : blue;`);

    let loadingDone = !!props.dictFilteredStockCompanyInfo;
    props.marketInfoList.forEach((obj) => loadingDone &&= !!obj);

    let cumulativeRatio = 0;

    let tbody = [];
    let index = 0;

    // (`props.dictFilteredStockCompanyInfo`, props.dictFilteredStockCompanyInfo);
    if (false == props.openSearchResult) {
        for (let key in props.dictFilteredStockCompanyInfo) {
            const { corp_code, active, 종목명, 유동자산, 부채총계, 상장주식수, 종가, 당기순이익, 시가총액, PER, PBR, bsnsDate, prevMarketInfo } = props.dictFilteredStockCompanyInfo[key];
            const fairPrice/*적정가*/ = Number((Number(유동자산) - Number(부채총계)) / Number(상장주식수)).toFixed(0);
            const ratio = Number(fairPrice / Number(종가));

            cumulativeRatio += ratio;

            tbody.push({
                key: parseInt(corp_code).toString(),
                corpCode: parseInt(corp_code),
                searchStockCompanyInfo: props.searchStockCompanyInfo,
                setOpenSearchResult: props.setOpenSearchResult,

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
    }

    const numOfStockItems = Object.keys(props.dictFilteredStockCompanyInfo).length;
    const 기대수익 = (numOfStockItems == 0) ? '0%' : `${Number((cumulativeRatio / numOfStockItems - 1) * 100).toFixed(1)}%`;
    const prevBsnsDate = (numOfStockItems == 0) ? '-' : props.dictFilteredStockCompanyInfo[Object.keys(props.dictFilteredStockCompanyInfo)[0]].prevMarketInfo.bsnsDate;
    const bsnsDate = (numOfStockItems == 0) ? '-' : props.dictFilteredStockCompanyInfo[Object.keys(props.dictFilteredStockCompanyInfo)[0]].bsnsDate;
    const thstrm_dt = (numOfStockItems == 0) ? '-' : props.dictFilteredStockCompanyInfo[Object.keys(props.dictFilteredStockCompanyInfo)[0]].thstrm_dt;

    const contents = [
        { title: `종목수`, description: `${numOfStockItems} 개` },
        { title: `목표수익률`, description: 기대수익, textColor: `text-black`, backGround: `` },
        { title: `이전 주가`, description: `${prevBsnsDate}`, textColor: `text-black`, backGround: `bg-amber-200` },
        { title: `주가`, description: `${bsnsDate}`, textColor: `text-black`, backGround: `bg-blue-200` },
        { title: `재무정보`, description: `${thstrm_dt}` },
        // { title: `현재가`, description: `x,xxx 원`, textColor: `text-black`, backGround: `bg-blue-500` },
        // { title: `목표가`, description: `xx,xxx 원`, textColor: `text-black`, backGround: `bg-red-500` },
    ];

    return (
        <>
            {
                (props.openSearchResult == true) ? <></> :
                    <div className='sm:px-20 md:px-40 lg:px-64 xl:px-80 2xl:px-96'>
                        <div className='visible'>
                            <MarQueue contents={contents} />
                        </div>
                        {/* <div className={`z-10 fixed top-0 w-full ${(true === props.scrollEffect) ? 'transition translate-y-2 visible' : 'invisible'}`}>
                <MarQueue contents={contents} />
            </div> */}
                        <Card className="w-full">
                            <List>
                                {(false == loadingDone) ?
                                    <Loading />
                                    :
                                    <ul className="snap-y">
                                        {(tbody.length > 0) ? tbody.map((item) => <ListNode key={item.key} {...item} deleteStockCompanyInList={props.deleteStockCompanyInList} />) : <></>}
                                    </ul>
                                }
                            </List>
                        </Card>
                    </div>
            }
        </>
    );
};