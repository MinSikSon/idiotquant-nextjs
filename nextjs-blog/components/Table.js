
import { Avatar, Card, Chip, IconButton, List, ListItem, ListItemPrefix, ListItemSuffix, Typography } from "@material-tailwind/react";
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
    return (
        <ListItem className="p-1 pb-2">
            <ListItemPrefix>
                <IconButton variant="text" color="blue-gray" onClick={() => props.deleteStockCompanyInList(props.tickerName)}>
                    <div>{props.index + 1}</div>
                    <TrashIcon className="h-5 w-5" />
                </IconButton>
            </ListItemPrefix>
            <div>
                <div className='flex'>
                    <Typography variant="h5">{props.tickerName}</Typography>
                    <div className='m-1'></div>
                    <Chip className="rounded-full p-1" value={props.ratio - 100 + "%"} color={(props.ratio - 100) >= 0 ? 'red' : 'blue'} variant={(props.ratio - 100) >= 0 ? 'outlined' : 'gradient'} />
                </div>
                <div className='flex'>
                    <Chip value={"현재가:" + props.close + " 원"} variant="ghost" size="sm" color="blue" className="rounded-full" />
                    <Chip value={"목표가:" + props.fairPrice + " 원"} variant="ghost" size="sm" color="red" className="rounded-full" />
                </div>
            </div>
            <ListItemSuffix>
                <CustomChart
                    tickerName={props.tickerName}
                    bsnsFullDate={props.bsnsFullDate}
                    fairPrice={props.fairPrice}

                    marketInfoList={props.marketInfoList}
                    // marketInfo20181214={props.marketInfo20181214}
                    // marketInfo20191213={props.marketInfo20191213}
                    // marketInfo20201214={props.marketInfo20201214}
                    // marketInfo20211214={props.marketInfo20211214}
                    // marketInfo20221214={props.marketInfo20221214}
                    // marketInfo20230111={props.marketInfo20230111}
                    // marketInfoLatest={props.marketInfoLatest}

                    responsive={false}
                    height={60}
                    width={90}
                    display={false}
                />
            </ListItemSuffix>
        </ListItem >
    );
};

//////////////////////////////////////////////////////////////////////////////
// Table
export default function Table(props) {
    let loadingDone = !!props.dictFilteredStockCompanyInfo;
    props.marketInfoList.forEach((obj) => loadingDone &&= !!obj);

    let cumulativeRatio = 0;

    let tbody = [];
    let index = 0;

    for (let key in props.dictFilteredStockCompanyInfo) {
        const { corp_code, active, 종목명, 유동자산, 부채총계, 상장주식수, 종가, 당기순이익, PER, bsnsDate } = props.dictFilteredStockCompanyInfo[key];

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
            PER: Number(PER),
            bsnsFullDate: bsnsDate,

            listedStocks: 상장주식수,
            marketInfoList: props.marketInfoList,
        });

        ++index;
    }

    const numOfStockItems = Object.keys(props.dictFilteredStockCompanyInfo).length;
    const 기대수익 = (numOfStockItems == 0) ? '0%' : `${Number((cumulativeRatio / numOfStockItems - 1) * 100).toFixed(1)}%`;
    const bsnsDate = (numOfStockItems == 0) ? '-' : props.dictFilteredStockCompanyInfo[Object.keys(props.dictFilteredStockCompanyInfo)[0]].bsnsDate;
    const thstrm_dt = (numOfStockItems == 0) ? '-' : props.dictFilteredStockCompanyInfo[Object.keys(props.dictFilteredStockCompanyInfo)[0]].thstrm_dt;

    const contents = [
        { title: `종목수`, description: numOfStockItems },
        { title: `기대수익률`, description: 기대수익, textColor: `text-black`, backGround: `bg-yellow-600` },
        { title: `주가 기준일자`, description: `${bsnsDate}` },
        { title: `재무정보 기준일자`, description: `${thstrm_dt}` },
        { title: `현재가`, description: `x,xxx 원`, textColor: `text-black`, backGround: `bg-blue-500` },
        { title: `목표가`, description: `xx,xxx 원`, textColor: `text-black`, backGround: `bg-red-500` },
    ];

    return (
        <div className='sm:px-20 md:px-40 lg:px-64 xl:px-80 2xl:px-96'>
            <div className='visible'>
                <MarQueue contents={contents} />
            </div>
            <div className={`z-10 fixed top-0 w-full ${(true === props.scrollEffect) ? 'transition translate-y-2 visible' : 'invisible'}`}>
                <MarQueue contents={contents} />
            </div>
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
    );
};