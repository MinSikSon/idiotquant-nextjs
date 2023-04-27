
import CustomChart from "./CustomChart";
import Loading from "./Loading";
import { Util } from "./Util";

const MarQueue = (props) => {
    const CardList = () => {
        return (
            <>
                {props.contents.map((content, index) => <Card key={index} title={content.title} description={content.description} textColor={content.textColor} backGround={content.backGround} />)}
            </>
        );
    };

    return (
        <div className='relative flex overflow-x-hidden'>
            {/* <div className='flex animate-marquee whitespace-nowrap'>
                <CardList />
            </div>
            <div className='flex absolute animate-marquee2 whitespace-nowrap'>
                <CardList />
            </div> */}
        </div>
    );
}

const ListNode = (props) => {
    const CloseIcon = () => {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="stroke-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
        );
    };

    return (
        <li className={`snap-center ${(true === props.active) ? `border border-red-500 rounded-l-2xl rounded-r-lg` : `border border-black`} text-gray-400 hover:border-red-500 cursor-pointer`}>
            <div className={`grid grid-cols-12 text-xs font-medium text-white font-mono`}>
                {(true === props.active) ?
                    <button className={`col-span-1 row-span-2 text-center text-lg font-mono bg-red-500 rounded-l-2xl`} onClick={() => props.deleteStockCompanyInList(props.tickerName)}>
                        <CloseIcon />
                    </button>
                    :
                    <div className={`col-span-1 row-span-2 text-center text-lg font-mono`}>
                        {props.index + 1}
                    </div>
                }

                <div className='col-span-11 grid grid-cols-11' onClick={() => { props.searchStockCompanyInfo(props.tickerName); props.setOpenSearchResult(false); }} >
                    <div className='self-center ml-1 col-span-5 text-lg grid grid-rows-2'>
                        <div className="row-span-1 text-white text-lg">{props.tickerName}</div>
                        <div className="row-span-1 text-gray-400 text-sm">기대수익률 {props.ratio - 100}%</div>
                    </div>
                    <div className="self-center col-span-3 grid text-base text-center">
                        <div className="row-span-1 rounded-t-sm bg-blue-500 text-white text-sm text-right pr-1">{props.close} 원</div>
                        <div className="row-span-1 rounded-b-sm bg-red-500 text-white text-sm text-right pr-1">{props.fairPrice} 원</div>
                    </div>
                    <div className="self-center col-span-3 grid justify-center">
                        {/* <CustomChart
                            corpCode={'cc1' + props.corpCode}

                            fairPrice={props.fairPrice}
                            tickerName={props.tickerName}
                            bsnsFullDate={props.bsnsFullDate}
                            marketCapitalization={props.marketCapitalization}
                            listedStocks={props.listedStocks}

                            marketInfo20181214={props.marketInfo20181214}
                            marketInfo20191213={props.marketInfo20191213}
                            marketInfo20201214={props.marketInfo20201214}
                            marketInfo20211214={props.marketInfo20211214}
                            marketInfo20221214={props.marketInfo20221214}
                            marketInfo20230111={props.marketInfo20230111}
                            marketInfoLatest={props.marketInfoLatest}

                            responsive={false}
                            height={'60'}
                            width={'90'}
                            display={false}
                        /> */}
                    </div>
                </div>
            </div>
        </li>
    );
};

//////////////////////////////////////////////////////////////////////////////
// Table
export default function Table(props) {
    let needLoading = true;
    [
        !!props.dictFilteredStockCompanyInfo,
        !!props.marketInfo20181214,
        !!props.marketInfo20191213,
        !!props.marketInfo20201214,
        !!props.marketInfo20211214,
        !!props.marketInfo20221214,
        !!props.marketInfo20230111,
        !!props.marketInfoLatest,
    ].forEach((item) => needLoading &&= item);

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
            marketInfo20181214: props.marketInfo20181214,
            marketInfo20191213: props.marketInfo20191213,
            marketInfo20201214: props.marketInfo20201214,
            marketInfo20211214: props.marketInfo20211214,
            marketInfo20221214: props.marketInfo20221214,
            marketInfo20230111: props.marketInfo20230111,
            marketInfoLatest: props.marketInfoLatest,
        });

        ++index;
    }

    const numOfStockItems = Object.keys(props.dictFilteredStockCompanyInfo).length;
    const 기대수익 = (numOfStockItems == 0) ? '0%' : `${Number((cumulativeRatio / numOfStockItems - 1) * 100).toFixed(1)}%`;
    const bsnsDate = (numOfStockItems == 0) ? '-' : props.dictFilteredStockCompanyInfo[Object.keys(props.dictFilteredStockCompanyInfo)[0]].bsnsDate;
    const thstrm_dt = (numOfStockItems == 0) ? '-' : props.dictFilteredStockCompanyInfo[Object.keys(props.dictFilteredStockCompanyInfo)[0]].thstrm_dt;

    const contents = [
        { title: `종목수`, description: numOfStockItems },
        { title: `기대수익률`, description: 기대수익, textColor: `text-white`, backGround: `bg-yellow-600` },
        { title: `주가 기준일자`, description: `${bsnsDate}` },
        { title: `재무정보 기준일자`, description: `${thstrm_dt}` },
        { title: `현재가`, description: `x,xxx 원`, textColor: `text-white`, backGround: `bg-blue-500` },
        { title: `목표가`, description: `xx,xxx 원`, textColor: `text-white`, backGround: `bg-red-500` },
    ];

    return (
        <>
            <div className='visible sm:invisible md:invisible'>
                <MarQueue contents={contents} />
            </div>
            <div className={`z-10 fixed top-0 w-full ${(true === props.scrollEffect) ? 'transition translate-y-2 visible' : 'invisible'}`}>
                <MarQueue contents={contents} />
            </div>
            {(false == needLoading) ?
                <Loading />
                :
                <ul className="snap-y">
                    {(tbody.length > 0) ? tbody.map((item) => <ListNode key={item.key} {...item} deleteStockCompanyInList={props.deleteStockCompanyInList} />) : <></>}
                </ul>
            }

        </>
    );
};