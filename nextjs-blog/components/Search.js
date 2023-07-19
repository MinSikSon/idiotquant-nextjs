import React from "react";
import SearchingListItem from "./SearchingListItem";
import { Util } from "./Util";
import CustomChart from "./CustomChart";
import {
    MagnifyingGlassIcon,
    ArrowUturnLeftIcon
} from "@heroicons/react/24/outline";

const Input = (props) => {
    const refFocus = React.useRef();

    React.useEffect(() => {
        if (!!props.openSearchResult) {
            refFocus.current.focus();
        }
    });

    return (
        <>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    props.searchStockCompanyInfo(props.searchingList[0]?.['종목명'] || '');
                    e.target[0].value = ''
                    props.setOpenSearchResult(true);
                }}
                className={`p-1 flex items-center ${props.openSearchResult ? 'border-b border-slate-500 mb-3 pb-3' : 'p-0.5 '}`}
            >
                <div className="rounded-md w-full flex">
                    {props.openSearchResult ?
                        <>
                            <div
                                className="py-2 pr-1"
                                onClick={(e) => { e.preventDefault(); props.setOpenSearchResult(false); }}
                            >
                                <ArrowUturnLeftIcon strokeWidth={2} className="h-7 w-7" />
                            </div>

                            <input
                                ref={refFocus}
                                name="searchValue"
                                className="bg-gray-200 appearance-none border-none w-full text-black p-2 rounded-lg text-base focus:outline-none"
                                type="text"
                                placeholder={props.inputPlaceholder}
                                value={props.inputValue}
                                aria-label="Full name"
                                onChange={(e) => {
                                    e.preventDefault();
                                    props.getSearchingList(e.target.value);
                                }}
                            />
                        </>
                        :
                        <></>
                    }
                </div>
                <button className='rounded-3xl p-2 pr-3 inline-flex items-center justify-center text-black focus:outline-none'>
                    <MagnifyingGlassIcon strokeWidth={2} className="h-7 w-7" />
                </button>
            </form>
        </>
    );
}


//////////////////////////////////////////////////////////////////////////////
// Search
export default function Search(props) {
    let jsonSearchResult = { '종목명': '-', 'stock_code': '-', '종가': 0, '유동자산': 0, '부채총계': 0, '당기순이익': 0, '거래량': 0, '시가총액': 1, '상장주식수': 1/*divide by zero 방지용*/, ...props.searchResult };
    let fairPrice/*적정가*/ = Number((Number(jsonSearchResult['유동자산']) - Number(jsonSearchResult['부채총계'])) / Number(jsonSearchResult['상장주식수'])).toFixed(0);
    let ratio = Number(fairPrice / Number(jsonSearchResult['종가']));

    let selectedSearchResult = {};
    selectedSearchResult['BPS'] = jsonSearchResult['BPS'];
    selectedSearchResult['DIV'] = jsonSearchResult['DIV'];
    selectedSearchResult['DPS'] = jsonSearchResult['DPS'];
    selectedSearchResult['EPS'] = jsonSearchResult['EPS'];
    selectedSearchResult['PBR'] = jsonSearchResult['PBR'];
    selectedSearchResult['PER'] = jsonSearchResult['PER'];

    jsonSearchResult['종가'] = selectedSearchResult['종가'] = Util.UnitConversion(jsonSearchResult['종가'], true);
    jsonSearchResult['유동자산'] = selectedSearchResult['유동자산'] = Util.UnitConversion(jsonSearchResult['유동자산'], true);
    jsonSearchResult['비유동자산'] = selectedSearchResult['비유동자산'] = Util.UnitConversion(jsonSearchResult['비유동자산'], true);
    jsonSearchResult['유동부채'] = selectedSearchResult['유동부채'] = Util.UnitConversion(jsonSearchResult['유동부채'], true);
    jsonSearchResult['비유동부채'] = selectedSearchResult['비유동부채'] = Util.UnitConversion(jsonSearchResult['비유동부채'], true);
    jsonSearchResult['부채총계'] = selectedSearchResult['부채총계'] = Util.UnitConversion(jsonSearchResult['부채총계'], true);
    jsonSearchResult['자본총계'] = selectedSearchResult['자본총계'] = Util.UnitConversion(jsonSearchResult['자본총계'], true);
    jsonSearchResult['자산총계'] = selectedSearchResult['자산총계'] = Util.UnitConversion(jsonSearchResult['자산총계'], true);
    jsonSearchResult['당기순이익'] = selectedSearchResult['당기순이익'] = Util.UnitConversion(jsonSearchResult['당기순이익'], true);
    jsonSearchResult['시가총액'] = selectedSearchResult['시가총액'] = Util.UnitConversion(jsonSearchResult['시가총액'], true);
    jsonSearchResult['매출액'] = selectedSearchResult['매출액'] = Util.UnitConversion(jsonSearchResult['매출액'], true);
    jsonSearchResult['영업이익'] = selectedSearchResult['영업이익'] = Util.UnitConversion(jsonSearchResult['영업이익'], true);
    jsonSearchResult['이익잉여금'] = selectedSearchResult['이익잉여금'] = Util.UnitConversion(jsonSearchResult['이익잉여금'], true);
    jsonSearchResult['거래대금'] = selectedSearchResult['거래대금'] = Util.UnitConversion(jsonSearchResult['거래대금'], true);
    jsonSearchResult['자본금'] = selectedSearchResult['자본금'] = Util.UnitConversion(jsonSearchResult['자본금'], true);
    if (isNaN(ratio)) {
        ratio = 0;
    }

    const CustomDiv = (props) => {
        return (
            <div className='mx-1 my-1 grid grid-cols-3 grid-rows-2 border-b border-gray-400'>
                <div className={`col-span-3 row-span-1 text-xs ${!!props.textColor ? props.textColor : `text-black`}`}>{props.title} {!!props.ratio ? props.ratio : ''}</div>
                <div className='col-span-3 row-span-1 text-right text-xs text-black'>{props.item}</div>
            </div>
        );
    }

    const CloseIcon = () => {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" className="w-6 h-6 stroke-white fill-black">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );
    }

    return (
        <div className={`
            ${props.scrollEffect && !props.openSearchResult ? 'translate translate-y-10' : ''}
            z-10 fixed w-fit top-0 rounded-xl
            md:px-20 lg:px-40 xl:px-64 2xl:px-80
            ${(true === props.openSearchResult || true === !!props.searchingList) ?
                `bg-gray-50 duration-300 w-screen h-screen`
                :
                `right-0 border-none duration-300`}
        `}>
            <div className={`${(true === props.openSearchResult || true === !!props.searchingList) ? 'bg-white rounded-md drop-shadow-md' : ''}`}>
                <Input {...props} />

                {(true === !!props.openSearchResult) ?
                    (true === !!props.searchingList) ?
                        <>
                            {props.searchingList.map((item, index) =>
                                <SearchingListItem
                                    key={index}
                                    movie={item}
                                    searchStockCompanyInfo={(stockCompany) => {
                                        props.setOpenSearchResult(true)
                                        props.searchStockCompanyInfo(stockCompany);
                                    }}
                                />)}

                        </>
                        :
                        (!!props.searchResult && Object.keys(props.searchResult).length > 0) ?
                            <>
                                <CustomChart
                                    fairPrice={fairPrice}
                                    tickerName={jsonSearchResult['종목명']}
                                    bsnsFullDate={(Object.keys(props.dictFilteredStockCompanyInfo).length > 0) ? props.dictFilteredStockCompanyInfo[Object.keys(props.dictFilteredStockCompanyInfo)[0]].bsnsDate : '-'}

                                    marketCapitalization={jsonSearchResult['시가총액']}
                                    listedStocks={jsonSearchResult['상장주식수']}
                                    marketInfoList={props.marketInfoList}
                                    // marketInfo20181214={props.marketInfo20181214}
                                    // marketInfo20191213={props.marketInfo20191213}
                                    // marketInfo20201214={props.marketInfo20201214}
                                    // marketInfo20211214={props.marketInfo20211214}
                                    // marketInfo20221214={props.marketInfo20221214}
                                    // marketInfo20230111={props.marketInfo20230111}
                                    // marketInfoLatest={props.marketInfoLatest}

                                    responsive={true}
                                    display={true}
                                />
                                <div className={`grid grid-cols-3`}>
                                    {Object.keys(selectedSearchResult).map((key, index) => <CustomDiv key={index} title={key} item={jsonSearchResult[key]} />)}
                                </div>
                            </>
                            :
                            <></>
                    : <></>
                }
            </div>
        </div>
    );
}