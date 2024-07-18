import { cleansing, isAllValid } from "@/lib/DataCleansing";


function filteredByNcavStrategy(arrFinancialMarketInfo) {
    function compareTwo(array, key1, key2) {
        return array.filter(item => isAllValid(item[key1], item[key2], true) && Number(item[key1]) >= Number(item[key2]));
    }

    function compareThree(array, key1, key2, key3) {
        return array.filter(item => isAllValid(item[key1], item[key2], item[key3]) && (Number(item[key1]) + Number(item[key2])) >= Number(item[key3]));
    }

    function filteredByCompare(array, keyA, keyB, keyC) {
        return array.filter(item => (isAllValid(item[keyA], item[keyB], item[keyC]) && (Number(item[keyA]) + Number(item[keyB])) <= Number(item[keyC])));
    }

    const arrFilteredByNCAV = filteredByCompare(arrFinancialMarketInfo, '시가총액', '부채총계', '유동자산');

    return arrFilteredByNCAV;
}

export function GetStockNameArrayFilteredByStrategyNCAV(stockCompanyInfo) {
    const arrObjFinancialMarketInfo = Array.from(Object.values(cleansing(stockCompanyInfo, ['거래량'])));
    const arrObjFilteredByNCAV = filteredByNcavStrategy(arrObjFinancialMarketInfo);

    let arrSorted1 = new Array(...arrObjFilteredByNCAV);
    arrSorted1.sort(function (a, b) {
        const 순유동자산비율A = (Number(a['유동자산']) - Number(a['부채총계'])) / Number(a['시가총액']);
        a['순유동자산비율'] = 순유동자산비율A;
        const 순유동자산비율B = (Number(b['유동자산']) - Number(b['부채총계'])) / Number(b['시가총액']);
        b['순유동자산비율'] = 순유동자산비율B;

        return 순유동자산비율B - 순유동자산비율A;
    });

    const companyList = new Array();
    arrSorted1.forEach(item => companyList.push(item['종목명']));

    return companyList;
}

export function GetStocksFilteredByStrategyNCAV(stockCompanyInfo) {
    const filteredStockNameList = GetStockNameArrayFilteredByStrategyNCAV(stockCompanyInfo);

    let filteredStocks = {};
    for (const i in filteredStockNameList) {
        const stockName = filteredStockNameList[i];
        filteredStocks[stockName] = stockCompanyInfo[stockName];
    }

    return filteredStocks;
}

export function GetMeredStocksList(financialInfo, marketInfo) {
    let mergedStockInfo = {};
    for (const [key, value] of Object.entries(financialInfo)) {
        if (true == !!!marketInfo[`data`][key]) continue;
        mergedStockInfo[key] = { ...value, ...marketInfo[`data`][key] };
    }

    return mergedStockInfo;
}

// filter 선택에 따라서, on/off 되게만 해도 좋을듯?
export function GetArrayFilteredByStrategyExample(stockCompanyInfo) {
    let arrFinancialMarketInfo = Array.from(Object.values(cleansing(stockCompanyInfo, ['PBR', '거래량', 'EPS'])));

    // 항목 추가
    arrFinancialMarketInfo.forEach(item => item['weight'] = 0);
    function addWeight(array) {
        let weight = 0;

        array.forEach(item => item['weight'] += (++weight));

        return array;
    }

    // sort(PBR)
    let arraySorted1 = new Array(...arrFinancialMarketInfo);
    arraySorted1.sort(function (a, b) {
        return Number(a['PBR']) - Number(b['PBR']);
    });
    addWeight(arraySorted1);

    // sort(capital)
    let arraySorted2 = new Array(...arraySorted1);
    arraySorted2.sort(function (a, b) {
        return Number(a['시가총액']) - Number(b['시가총액']);
    });
    addWeight(arraySorted2);
    // 시가총액 하위 20% cut-line
    const cutLine = Number(arraySorted2.length * 0.2).toFixed(0);
    // console.log(`cut-line(${cutLine}) 시가총액: ${Util.UnitConversion(arraySorted2[cutLine]['시가총액'], true)}, `, arraySorted2[cutLine]);

    // sort(PER)
    let arraySorted3 = new Array(...arraySorted2);
    arraySorted3.sort(function (a, b) {
        return Number(a['PER']) - Number(b['PER']);
    });
    addWeight(arraySorted3);

    // sort(weight)
    let arraySorted4 = new Array(...arraySorted3);
    arraySorted4.sort(function (a, b) {
        return Number(a['weight']) - Number(b['weight']);
    });

    // console.log(`arraySorted4`, arraySorted4);
    const arrSelectedStockCompany = arraySorted4.slice(0, 40);

    const companyList = new Array();
    arrSelectedStockCompany.forEach(item => companyList.push(item['종목명']));

    return companyList;
}
