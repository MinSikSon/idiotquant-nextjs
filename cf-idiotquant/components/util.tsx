"use client"

//////////////////////////////////////////////////////////////////////////////
// Util
export class Util {
    static UnitConversion(num: number, addWon: boolean) {
        if (isNaN(num)) {
            return '0원';
        }

        // if (num <= 1000 && num >= 0) return num; // 소수점 단위 일반 출력

        let conversionCount = 0;

        let n: number = Number(num);
        if (n > 0) {
            for (let i = 0; i < 10; i++) {
                if (n < 10000) {
                    break;
                }
                n = Number((n / 10000).toFixed(1));
                conversionCount++;
            }
        }
        else {
            for (let i = 0; i < 10; i++) {
                if (n > -10000) {
                    break;
                }
                n = Number((n / 10000).toFixed(1));
                conversionCount++;
            }
        }

        const currencyUnit = (true === !!addWon) ? `원` : ``;

        const koreanUnit = ['', '만', '억', '조', '경'];
        const fixed = [0, 1, 0, 2, 5];

        return Number(n).toFixed(fixed[conversionCount]) + koreanUnit[conversionCount] + currencyUnit;

        switch (conversionCount) {
            case 1: return `${Number(n).toFixed(1)}만${currencyUnit}`;
            case 2: return `${Number(n).toFixed(0)}억${currencyUnit}`;
            case 3: return `${Number(n).toFixed(2)}조${currencyUnit}`;
            case 4: return `${Number(n).toFixed(5)}경${currencyUnit}`;
        }

        return `${Number(num).toFixed(0)}${currencyUnit}`;
    }
};


export function escapeSpecialCharacters(url: any) {
    // 특수 문자를 정의합니다.
    const specialCharacters = /[!#$%&'()*+,/:;=?@[\]<>\\^`{|}~.]/g;

    // 특수 문자 앞에 백슬래시를 추가합니다.
    return url.replace(specialCharacters, (match: any) => '\\' + match);
}

export const registerCookie = (key: string, value: string) => {
    document.cookie = `${key}=${value}; path=/; expires=Fri, 31 Dec 2025 23:59:59 GMT`; // [NOTE] 만료일 임시 설정
}

export const clearCookie = (key: string) => {
    document.cookie = `${key}=""; path=/; expires=Fri, 31 Dec 2025 23:59:59 GMT`; // [NOTE] 만료일 임시 설정
}

export const getCookie = (name: string) => {
    const cookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith(name + "="))
        ?.split("=")[1];

    if (undefined == cookie) {
        return "";
    }

    return cookie;
};

export const isValidCookie = (name: string) => {
    const cookie = getCookie(name);
    if (undefined == cookie) {
        return false;
    }

    if ("\"\"" == cookie) {
        return false;
    }

    if ("" == cookie) {
        return false;
    }

    return true;
};
