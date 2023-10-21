import React from "react";
import SearchingListItem from "./SearchingListItem";
import { Util } from "./Util";
import CustomChart from "./CustomChart";
import {
    MagnifyingGlassIcon,
    ArrowUturnLeftIcon
} from "@heroicons/react/24/outline";
import { ListItem, ListItemPrefix, ListItemSuffix } from "@material-tailwind/react";


const Input = (props) => {
    // console.log(`%c[call] Input`, `color : white; background : blue`);

    const refFocus = React.useRef();

    React.useEffect(() => {
        if (!!props.openSearchResult) {
            refFocus.current.focus();
        }
    });

    // console.log(`props.openSearchResult`, props.openSearchResult);
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                props.searchStockCompanyInfo(props.searchingList[0]?.['종목명'] || '');
                e.target[0].value = ''
                props.setOpenSearchResult(true);
            }}
            className={`flex items-center ${props.openSearchResult ? 'border-b border-slate-500 mb-3 pb-2' : 'p-0.5 '}`}
        >
            <ListItem className="p-0 pt-2 px-1 ">
                {props.openSearchResult ?
                    <>
                        <ListItemPrefix>
                            <div
                                className=""
                                onClick={(e) => { e.preventDefault(); props.setOpenSearchResult(false); }}
                            >
                                <ArrowUturnLeftIcon strokeWidth={2} className="h-7 w-7" />
                            </div>
                        </ListItemPrefix>
                        <input
                            ref={refFocus}
                            name="searchValue"
                            className="bg-gray-100 appearance-none border-none w-full text-black p-2 rounded-lg text-sm focus:outline-none"
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
                <ListItemSuffix className=''>
                    <button className='rounded-3xl pr-4 inline-flex items-center justify-center text-black focus:outline-none'>
                        <MagnifyingGlassIcon strokeWidth={2} className="h-7 w-7" />
                    </button>
                </ListItemSuffix>
            </ListItem>
        </form>
    );
}


//////////////////////////////////////////////////////////////////////////////
// Search
function _getSelectedSearchResult(searchResult) {
    let jsonSearchResult = { '종목명': '-', 'stock_code': '-', '종가': 0, '유동자산': 0, '부채총계': 0, '당기순이익': 0, '거래량': 0, '시가총액': 1, '상장주식수': 1/*divide by zero 방지용*/, ...searchResult };

    let selectedSearchResult = {};
    selectedSearchResult['BPS'] = jsonSearchResult['BPS'];
    selectedSearchResult['DIV'] = jsonSearchResult['DIV'];
    selectedSearchResult['DPS'] = jsonSearchResult['DPS'];
    selectedSearchResult['EPS'] = jsonSearchResult['EPS'];
    selectedSearchResult['PBR'] = jsonSearchResult['PBR'];
    selectedSearchResult['PER'] = jsonSearchResult['PER'];

    selectedSearchResult['종가'] = jsonSearchResult['종가'] = Util.UnitConversion(jsonSearchResult['종가'], true);
    selectedSearchResult['유동자산'] = jsonSearchResult['유동자산'] = Util.UnitConversion(jsonSearchResult['유동자산'], true);
    selectedSearchResult['비유동자산'] = jsonSearchResult['비유동자산'] = Util.UnitConversion(jsonSearchResult['비유동자산'], true);
    selectedSearchResult['유동부채'] = jsonSearchResult['유동부채'] = Util.UnitConversion(jsonSearchResult['유동부채'], true);
    selectedSearchResult['비유동부채'] = jsonSearchResult['비유동부채'] = Util.UnitConversion(jsonSearchResult['비유동부채'], true);
    selectedSearchResult['부채총계'] = jsonSearchResult['부채총계'] = Util.UnitConversion(jsonSearchResult['부채총계'], true);
    selectedSearchResult['자본총계'] = jsonSearchResult['자본총계'] = Util.UnitConversion(jsonSearchResult['자본총계'], true);
    selectedSearchResult['자산총계'] = jsonSearchResult['자산총계'] = Util.UnitConversion(jsonSearchResult['자산총계'], true);
    selectedSearchResult['당기순이익'] = jsonSearchResult['당기순이익'] = Util.UnitConversion(jsonSearchResult['당기순이익'], true);
    selectedSearchResult['시가총액'] = jsonSearchResult['시가총액'] = Util.UnitConversion(jsonSearchResult['시가총액'], true);
    selectedSearchResult['매출액'] = jsonSearchResult['매출액'] = Util.UnitConversion(jsonSearchResult['매출액'], true);
    selectedSearchResult['영업이익'] = jsonSearchResult['영업이익'] = Util.UnitConversion(jsonSearchResult['영업이익'], true);
    selectedSearchResult['이익잉여금'] = jsonSearchResult['이익잉여금'] = Util.UnitConversion(jsonSearchResult['이익잉여금'], true);
    selectedSearchResult['거래대금'] = jsonSearchResult['거래대금'] = Util.UnitConversion(jsonSearchResult['거래대금'], true);
    selectedSearchResult['자본금'] = jsonSearchResult['자본금'] = Util.UnitConversion(jsonSearchResult['자본금'], true);

    return selectedSearchResult;
}
export default function Search(props) {
    // console.log(`%c[call] Search`, `color : white; background : blue`);

    let jsonSearchResult = { '종목명': '-', 'stock_code': '-', '종가': 0, '유동자산': 0, '부채총계': 0, '당기순이익': 0, '거래량': 0, '시가총액': 1, '상장주식수': 1/*divide by zero 방지용*/, ...props.searchResult };
    let fairPrice/*적정가*/ = Number((Number(jsonSearchResult['유동자산']) - Number(jsonSearchResult['부채총계'])) / Number(jsonSearchResult['상장주식수'])).toFixed(0);
    let ratio = Number(fairPrice / Number(jsonSearchResult['종가']));
    if (isNaN(ratio)) {
        ratio = 0;
    }

    let selectedSearchResult = _getSelectedSearchResult(jsonSearchResult);

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

    // console.warn(`props.openSearchResult`, props.openSearchResult);
    return (
        <div className={`z-10 rounded-xl
            ${props.scrollEffect && !props.openSearchResult ? 'translate translate-y-10' : ''}
            ${(true === props.openSearchResult || true === !!props.searchingList) ?
                `bg-gray-50 duration-300 w-screen h-screen`
                :
                `border-none duration-300`}
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