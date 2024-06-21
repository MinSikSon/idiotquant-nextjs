import React from "react";
import SearchingListItem from "./SearchingListItem";
import { Util } from "./Util";
import CustomChart from "./CustomChart";
import { MagnifyingGlassIcon, ArrowUturnLeftIcon } from "@heroicons/react/24/outline";
import { Chip, ListItem, ListItemPrefix, ListItemSuffix } from "@material-tailwind/react";


const Input = (props) => {
    // console.log(`%c[call] Input`, `color : white; background : blue`);

    const refFocus = React.useRef();

    React.useEffect(() => {
        // console.log(`props.searchResult`, props.searchResult);
        if ('' !== props.openedPanel) {
            if (!!!props.searchResult) {
                if (Object.keys(props.searchResult).length == 0) {
                    if (!!refFocus.current) {
                        refFocus.current.focus();
                    }
                    props.setSearchResult('');
                }
            }
        }
    }, [props.openedPanel]);

    return (
        <form className={`flex items-center p-0 m-0 bg-none`}
            onSubmit={(e) => {
                e.preventDefault();
                props.handleSearchStockCompanyInfo(props.searchingList[0]?.['종목명'] || '');
                e.target[0].value = ''
            }}
        >
            <ListItem className={`p-0 text-black bg-none`}>
                {(('SearchPanel' === props.openedPanel) || ('AddStockInGroupPanel' === props.openedPanel)) ?
                    <>
                        <ListItemPrefix>
                            <div onClick={(e) => {
                                props.handleArrowUturnLeftIcon(e);
                            }}>
                                <ArrowUturnLeftIcon strokeWidth={2} className="h-6 w-6" />
                            </div>
                        </ListItemPrefix>
                        <input
                            ref={refFocus}
                            name="searchValue"
                            className="appearance-none w-full text-black text-sm rounded-2xl p-4 h-6 border-2 hover:border-gray-400 hover:outline-none"
                            type="text"
                            placeholder={props.inputPlaceholder}
                            value={props.inputValue}
                            aria-label="Full name"
                            onChange={(e) => {
                                e.preventDefault();
                                props.getSearchingList(e.target.value);
                            }}
                            onClick={(e) => {
                                e.preventDefault();
                                props.setSearchResult('');
                            }}
                        />
                    </>
                    : <></>
                }
                {(('' === props.openedPanel) || ('SearchPanel' === props.openedPanel) || ('AddStockInGroupPanel' === props.openedPanel)) ?
                    <ListItemSuffix>
                        <button
                            className={`rounded-3xl ${props.searchPanelIsOpened ? 'pr-7' : 'pr-3'} inline-flex items-center justify-center text-black focus:outline-none`}
                            onClick={(e) => {
                                e.preventDefault();
                                props.handleSearchStockCompanyInfo(props.searchingList[0]?.['종목명'] || '');
                            }}
                        >
                            <MagnifyingGlassIcon strokeWidth={2} className="h-6 w-6" />
                        </button>
                    </ListItemSuffix>
                    : <></>
                }
            </ListItem>
        </form>
    );
}


//////////////////////////////////////////////////////////////////////////////
// Search
function _getSelectedSearchResult(searchResult, financialInfoList) {
    // console.log(`financialInfoList`, financialInfoList);
    let jsonSearchResult = { '종목명': '-', 'stock_code': '-', '종가': 0, '유동자산': 0, '부채총계': 0, '당기순이익': 0, '거래량': 0, '시가총액': 1, '상장주식수': 1/*divide by zero 방지용*/, '자본금': 0, ...searchResult };

    let selectedSearchResult = {};
    selectedSearchResult['종가'] = jsonSearchResult['종가'] = Util.UnitConversion(jsonSearchResult['종가'], true);

    // console.log(`searchResult`, searchResult);
    if (0 == Number(jsonSearchResult['자본금'])) {
        selectedSearchResult['ROE'] = "자본금 누락";
    }

    let 당기순이익_합산 = 0;
    let 자본금_합산 = 0;
    if (0 == Number(jsonSearchResult['이익잉여금'])) {
        selectedSearchResult['ROE'] = "이익잉여금 누락";
    }
    else {
        const 자기자본 = (Number(jsonSearchResult['자본금']) + Number(jsonSearchResult['이익잉여금']));
        // console.log(`자기자본`, 자기자본);
        if (0 >= 자기자본) {
            selectedSearchResult['ROE'] = "자본 줄어드는 중";
        }
        else {
            // selectedSearchResult['ROE'] = Number(100 * Number(jsonSearchResult['당기순이익']) / 자기자본).toFixed(1);
            // console.log(`selectedSearchResult['ROE']`, selectedSearchResult['ROE']);
            // console.log(`financialInfoList`, financialInfoList);
            const start = Object.keys(financialInfoList).length - 1;
            const end = Object.keys(financialInfoList).length - 4;
            let 당기순이익_누락 = false;
            for (let i = start; i >= end; --i) {
                // const key = Object.keys(financialInfoList)[i];
                const financialInfo = Object.values(financialInfoList)[i];
                if (undefined == financialInfo[jsonSearchResult['종목명']]) {
                    selectedSearchResult['ROE'] = "당기순이익 누락";
                    당기순이익_누락 = true;
                    break;
                }
                if (!!financialInfo[jsonSearchResult['종목명']]['당기순이익(손실)']) {
                    당기순이익_합산 -= Number(financialInfo[jsonSearchResult['종목명']]['당기순이익']);
                }
                else {
                    당기순이익_합산 += Number(financialInfo[jsonSearchResult['종목명']]['당기순이익']);
                }
                자본금_합산 += (Number(financialInfo[jsonSearchResult['종목명']]['자본금']) + Number(financialInfo[jsonSearchResult['종목명']]['이익잉여금']));
                // console.log(i, `1 financialInfo[jsonSearchResult['종목명']]`, financialInfo[jsonSearchResult['종목명']]);
                // console.log(i, `2 당기순이익_합산`, 당기순이익_합산);
            }
            const 자본금_평균 = 자본금_합산 / 4;
            // console.log(`당기순이익_합산 / 자기자본`, 100 * 당기순이익_합산 / 자기자본);
            if (당기순이익_누락 == false) {
                selectedSearchResult['ROE'] = Number(100 * 당기순이익_합산 / 자본금_평균).toFixed(1);
                selectedSearchResult['ROE'] += "%";
            }
        }
    }

    if (0 == jsonSearchResult['PER']) {
        selectedSearchResult['PER'] = "전 분기 적자";
    }
    else {
        selectedSearchResult['PER'] = jsonSearchResult['PER'];
    }
    if (0 == jsonSearchResult['EPS']) {
        selectedSearchResult['EPS'] = "전 분기 적자";
    }
    else {
        selectedSearchResult['EPS'] = jsonSearchResult['EPS'];
    }
    selectedSearchResult['PBR'] = jsonSearchResult['PBR'];
    selectedSearchResult['BPS'] = jsonSearchResult['BPS'];
    selectedSearchResult['DIV'] = jsonSearchResult['DIV'];
    selectedSearchResult['DPS'] = jsonSearchResult['DPS'];

    selectedSearchResult['시가총액'] = jsonSearchResult['시가총액'] = Util.UnitConversion(jsonSearchResult['시가총액'], true);
    selectedSearchResult['매출액'] = jsonSearchResult['매출액'] = Util.UnitConversion(jsonSearchResult['매출액'], true);
    selectedSearchResult['당기순이익'] = jsonSearchResult['당기순이익'] = Util.UnitConversion(jsonSearchResult['당기순이익'], true);
    selectedSearchResult['연간순이익'] = Util.UnitConversion(당기순이익_합산, true);
    selectedSearchResult['영업이익'] = jsonSearchResult['영업이익'] = Util.UnitConversion(jsonSearchResult['영업이익'], true);
    selectedSearchResult['거래대금'] = jsonSearchResult['거래대금'] = Util.UnitConversion(jsonSearchResult['거래대금'], true);
    selectedSearchResult['이익잉여금'] = jsonSearchResult['이익잉여금'] = Util.UnitConversion(jsonSearchResult['이익잉여금'], true);
    selectedSearchResult['유동자산'] = jsonSearchResult['유동자산'] = Util.UnitConversion(jsonSearchResult['유동자산'], true);
    selectedSearchResult['비유동자산'] = jsonSearchResult['비유동자산'] = Util.UnitConversion(jsonSearchResult['비유동자산'], true);
    selectedSearchResult['유동부채'] = jsonSearchResult['유동부채'] = Util.UnitConversion(jsonSearchResult['유동부채'], true);
    selectedSearchResult['비유동부채'] = jsonSearchResult['비유동부채'] = Util.UnitConversion(jsonSearchResult['비유동부채'], true);
    selectedSearchResult['부채총계'] = jsonSearchResult['부채총계'] = Util.UnitConversion(jsonSearchResult['부채총계'], true);
    selectedSearchResult['자본총계'] = jsonSearchResult['자본총계'] = Util.UnitConversion(jsonSearchResult['자본총계'], true);
    selectedSearchResult['자산총계'] = jsonSearchResult['자산총계'] = Util.UnitConversion(jsonSearchResult['자산총계'], true);
    selectedSearchResult['자본금'] = jsonSearchResult['자본금'] = Util.UnitConversion(jsonSearchResult['자본금'], true);
    selectedSearchResult['상장주식수'] = jsonSearchResult['상장주식수'] + "개";
    // selectedSearchResult[' '] = ' ';
    selectedSearchResult['ROE='] = "100 * 연간순이익 / (자본금 + 이익잉여금)";
    selectedSearchResult['  '] = ' ';

    return selectedSearchResult;
}
export default function SearchPanel(props) {
    // console.log(`%cSearchPanel`, `color : white; background : blue`);
    // console.log(`props.openedPanel`, props.openedPanel);

    let jsonSearchResult = { '종목명': '-', 'stock_code': '-', '종가': 0, '유동자산': 0, '부채총계': 0, '당기순이익': 0, '거래량': 0, '시가총액': 1, '상장주식수': 1/*divide by zero 방지용*/, ...props.searchResult };
    // console.log(`jsonSearchResult['종목명']`, jsonSearchResult['종목명']);
    let fairPrice/*적정가*/ = Number((Number(jsonSearchResult['유동자산']) - Number(jsonSearchResult['부채총계'])) / Number(jsonSearchResult['상장주식수'])).toFixed(0);
    let ratio = Number(fairPrice / Number(jsonSearchResult['종가']));
    if (isNaN(ratio)) {
        ratio = 0;
    }

    // let selectedSearchResult = _getSelectedSearchResult(jsonSearchResult, props.financialInfoList);

    const CustomDiv = (props) => {
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
        // console.log(`index`, index);
        const bgColor = (-1 === index) ? '' : 'bg-blue-700';
        const titleTextColor = (-1 === index) ? 'text-gray-700' : 'text-white';
        const itemTextColor = (-1 === index) ? 'text-black' : 'text-white';
        return (
            <ListItem className={`p-0 px-1 m-0 mx-1 w-11/12 rounded-full border-b-2 border-gray-200 ${bgColor}`}>
                <ListItemPrefix className="p-0 pl-1 m-0">
                    <Chip className={`text-xs m-0 p-0 border-none ${titleTextColor}`} variant="outlined" value={props.title} />
                </ListItemPrefix>
                <ListItemSuffix className="p-0 pr-1 my-0">
                    <Chip className={`text-sm m-0 p-0 border-none ${itemTextColor}`} variant="outlined" value={props.item} />
                </ListItemSuffix>
            </ListItem>
        );
    }

    // console.log(`props.searchPanelIsOpened`, props.searchPanelIsOpened);
    // console.log(`props.searchingList`, props.searchingList);
    // console.log(`props.searchResult`, props.searchResult);
    // if ('SearchPanel' === props.openedPanel) return <Input {...props} />;

    // console.log(`props.stocksOfInterestPanelOpened`, props.stocksOfInterestPanelOpened);
    // console.log(`jsonSearchResult`, jsonSearchResult);
    return (
        <div className={`z-10 w-full`}>
            {/* <Input {...props} /> */}
            {
                (true === !!props.searchingList && Object.keys(props.searchingList).length > 0) ?
                    <>
                        {props.searchingList.map((item, index) =>
                            <SearchingListItem
                                key={index}
                                movie={item}
                                handleSearchStockCompanyInfo={props.handleSearchStockCompanyInfo}
                            />)}
                    </>
                    :
                    ('StocksOfInterestPanel' === props.openedPanel ?
                        <></> :
                        (true === !!props.searchResult && Object.keys(props.searchResult).length > 0 ?
                            <>
                                <Chip className="w-fit border-none text-black text-md pb-0 my-0" variant="outlined" value={jsonSearchResult['종목명']} />
                                <Chip className="border-none text-black text-2xl b-0 py-0 m-0" variant="outlined" value={`${Number(jsonSearchResult['종가']).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`} />
                                <CustomChart
                                    fairPrice={fairPrice}
                                    tickerName={jsonSearchResult['종목명']}
                                    bsnsFullDate={(Object.keys(jsonSearchResult).length > 0) ? jsonSearchResult.bsnsDate : '-'}

                                    marketCapitalization={jsonSearchResult['시가총액']}
                                    listedStocks={jsonSearchResult['상장주식수']}
                                    marketInfoList={props.marketInfoList}

                                    responsive={true}
                                    display={false}
                                    height={'60px'}
                                    width={'90px'}
                                />
                                <div className={`grid grid-cols-2 pr-1`}>
                                    {/* {Object.keys(selectedSearchResult).map((key, index) => <CustomDiv key={index} title={key} item={selectedSearchResult[key]} />)} */}
                                </div>
                            </>
                            : <></>
                        )
                    )

            }
        </div>
    );
}
