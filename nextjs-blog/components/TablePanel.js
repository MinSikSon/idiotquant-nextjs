
import { Card, CardBody, CardHeader, Chip, IconButton, List, ListItem, ListItemPrefix, ListItemSuffix, Popover, PopoverContent, PopoverHandler, Typography } from "@material-tailwind/react";
import CustomCard from "./CustomCard";
import CustomChart from "./CustomChart";
import Loading from "./Loading";
import { Util } from "./Util";
import { CurrencyDollarIcon, TrashIcon } from "@heroicons/react/24/outline";

const MarQueue = (props) => {
    return (
        <div className='relative flex overflow-x-scroll'>
            <>
                {props.contents.map((content, index) => <CustomCard key={index} title={content.title} description={content.description} textColor={content.textColor} backGround={content.backGround} />)}
            </>
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
export default function TablePanel(props) {
    // console.log(`%c TablePanel`, `color:blue; background:white`);

    // console.log(`TablePanel 1`, props.openSearchResult);
    // console.log(`TablePanel 2`, props.searchingList);
    if (!props.openSearchResult) <>hihi</>;

    let loadingDone = !!props.dictFilteredStockCompanyInfo;
    props.marketInfoList.forEach((obj) => loadingDone &&= !!obj);

    let cumulativeRatio = 0;

    let tbody = [];
    let index = 0;

    // (`props.dictFilteredStockCompanyInfo`, props.dictFilteredStockCompanyInfo);
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

    const CardList = (props) => {
        function extractVideoID(url) {
            var regExp =
                /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
            var match = url.match(regExp);
            if (match && match[7].length == 11) {
                return match[7];
            } else {
                alert("Could not extract video ID.");
            }
        }
        const videoId = extractVideoID(`https://www.youtube.com/watch?v=xguam0TKMw8`);

        return (
            <Card className="px-0">
                <CardHeader shadow={false} floated={false} color={props.color} className="mb-2 grid place-items-center rounded-none" >
                    {/* <img
                    src="https://img.freepik.com/free-photo/happy-face-asian-business-man-holding-money-us-dollar-bills-on-business-district-urban_1150-34754.jpg?w=996&t=st=1698503020~exp=1698503620~hmac=544881a393fa191b91a2c06cb1f1d55ac5a34604726b616e0d2fe592119cc01f"
                    alt="card-image"
                    className="h-full w-full object-cover"
                /> */}
                    {/* <video className="h-full w-full rounded-lg" controls autoPlay muted>
                    <source src="https://www.youtube.com/watch?v=xguam0TKMw8" type="video/mp4" />
                    Your browser does not support the video tag.
                </video> */}
                    {/* <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        allowFullScreen
                    /> */}
                    <Typography variant="h3" color='white'>{props.ratio}</Typography>
                </CardHeader>
                <CardBody className="m-0 p-0">
                    <Typography className="pl-2" variant="h5" color={`${props.color}`}>시가총액 대비 순유동자산이 {props.ratio} 인 종목입니다.</Typography>
                    {(props.tbody.length > 0) ? props.tbody.map((item) => <ListNode key={item.key} {...item} deleteStockCompanyInList={props.deleteStockCompanyInList} />) : <></>}
                </CardBody>
            </Card>
        );
    }

    let over100 = [];
    let over50 = [];
    let under50 = [];

    // console.log(`tbody`, tbody);
    for (let i = 0; i < tbody.length; ++i) {
        if (tbody[i].ratio >= 200) {
            over100.push(tbody[i]);
        }
        else if (tbody[i].ratio >= 150) {
            over50.push(tbody[i]);
        }
        else {
            under50.push(tbody[i]);
        }
    }

    return (
        <>
            <div className='visible'>
                <MarQueue contents={contents} />
            </div>
            <Card className="w-full">
                <List className="px-0">
                    {(false == loadingDone) ?
                        <Loading />
                        :
                        <>
                            <CardList tbody={over100} loop={5} ratio={'100% 이상'} color={'red'} deleteStockCompanyInList={props.deleteStockCompanyInList} />
                            <CardList tbody={over50} loop={2} ratio={'50% 이상'} color={'orange'} deleteStockCompanyInList={props.deleteStockCompanyInList} />
                            <CardList tbody={under50} loop={5} ratio={'50% 이하'} color={'blue'} deleteStockCompanyInList={props.deleteStockCompanyInList} />
                        </>
                    }
                </List>
            </Card>
        </>
    );
};