export function cleansing(dictOrigin, condition = ['거래량', '영업이익', '당기순이익']) {
    function filtering(array, key) {
        return array.filter(item => undefined != item && !!item[key] && 0 < Number(item[key]));
    }

    const originArray = Array.from(Object.values(dictOrigin));
    let finalFilteredArray = originArray;

    for (let i = 0; i < condition.length; ++i) {
        finalFilteredArray = filtering(finalFilteredArray, condition[i]);
    }

    let dict = {};

    finalFilteredArray.forEach((element) => {
        dict[element['종목명']] = element;
    });

    return dict;
}


export function isAllValid(item1, item2, item3) {
    return !!item1 && !!item2 && !!item3;
}