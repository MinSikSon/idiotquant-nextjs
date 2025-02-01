import { cleansing } from "@/lib/DataCleansing";

function filteredByEachCompare(array: any, keys: any[], conditions: any[]) {
    return array.filter((item: any) => {
        for (let i = 0; i < keys.length; i++) {
            if ('ALL' == conditions[i]) {
                return true;
            }

            // 값 없는 경우 제외
            if ("PER" == keys[i] && 0 == Number(item[keys[i]])) {
                return false;
            }
            if ("PBR" == keys[i] && 0 == Number(item[keys[i]])) {
                return false;
            }
            if ("시가총액" == keys[i] && 0 == Number(item[keys[i]])) {
                return false;
            }

            if (!!!item[keys[i]])
                return false;
            if (item[keys[i]] > conditions[i])
                return false;
        }

        return true;
    });
}

// function filteredByNcavStrategy(arrFinancialMarketInfo: any) {
//     function compareTwo(array: any, key1: any, key2: any) {
//         return array.filter((item: any) => isAllValid(item[key1], item[key2], true) && Number(item[key1]) >= Number(item[key2]));
//     }

//     function compareThree(array: any, key1: any, key2: any, key3: any) {
//         return array.filter((item: any) => isAllValid(item[key1], item[key2], item[key3]) && (Number(item[key1]) + Number(item[key2])) >= Number(item[key3]));
//     }

//     function filteredByCompare(array: any, keyA: any, keyB: any, keyC: any) {
//         return array.filter((item: any) => (isAllValid(item[keyA], item[keyB], item[keyC]) && (Number(item[keyA]) + Number(item[keyB])) <= Number(item[keyC])));
//     }

//     const arrFilteredByNCAV = filteredByCompare(arrFinancialMarketInfo, '시가총액', '부채총계', '유동자산');

//     return arrFilteredByNCAV;
// }

export function GetStockNameArrayFilteredByCustom(stockCompanyInfo: any, keys: any[], conditions: any[]) {
    const arrObjFinancialMarketInfo = Array.from(Object.values(cleansing(stockCompanyInfo, ['거래량'])));
    const arrObjFilteredByCustom = filteredByEachCompare(arrObjFinancialMarketInfo, keys, conditions);

    let arrSorted1 = new Array(...arrObjFilteredByCustom);
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

export function GetStocksFilteredByCustom(stockCompanyInfo: any, keys: any[], conditions: any[]) {
    const filteredStockNameList = GetStockNameArrayFilteredByCustom(stockCompanyInfo, keys, conditions);

    let filteredStocks: any = {};
    for (const i in filteredStockNameList) {
        const stockName = filteredStockNameList[i];
        filteredStocks[stockName] = stockCompanyInfo[stockName];
    }

    return filteredStocks;
}
