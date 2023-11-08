//////////////////////////////////////////////////////////////////////////////
// Util
export class Util {
    static UnitConversion(num, addWon) {
        if (num <= 10000 && num >= 0) return num; // 소수점 단위 일반 출력

        if (isNaN(num)) {
            return '0원';
        }

        let conversionCount = 0;

        let n = Number(num);
        if (n > 0) {
            for (let i = 0; i < 10; i++) {
                if (n < 10000) {
                    break;
                }
                n = (n / 10000).toFixed(1);
                conversionCount++;
            }
        }
        else {
            for (let i = 0; i < 10; i++) {
                if (n > -10000) {
                    break;
                }
                n = (n / 10000).toFixed(1);
                conversionCount++;
            }
        }

        const currencyUnit = (true === !!addWon) ? `원` : ``;

        switch (conversionCount) {
            case 1: return `${Number(n).toFixed(1)}만${currencyUnit}`;
            case 2: return `${Number(n).toFixed(0)}억${currencyUnit}`;
            case 3: return `${Number(n).toFixed(2)}조${currencyUnit}`;
        }

        return `${Number(num).toFixed(0)}${currencyUnit}`;
    }
};
