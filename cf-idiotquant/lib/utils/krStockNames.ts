import englishNames from '../../public/data/kr-stock-english-names.json' with { type: 'json' };

import koreanCodes from '../../public/data/validCorpCode.json' with { type: 'json' };

const codesByKoreanName: Readonly<Record<string, { stock_code: string }>> = koreanCodes;

export function krStockCode(symbolOrName: string): string | undefined {
    const value = symbolOrName.trim();
    if (/^[0-9][A-Z0-9]{5}$/i.test(value)) return value.toUpperCase();
    return Object.hasOwn(codesByKoreanName, value) ? codesByKoreanName[value].stock_code : undefined;
}

const englishByCode: Readonly<Record<string, string>> = englishNames;

const japaneseByCode: Readonly<Record<string, string>> = {
    // https://ssd.skhynix.com/jp/about_us/
    '000660': 'SKハイニックス',
    // https://www.samsung.com/jp/about-us/company-info/
    '005930': 'サムスン電子',
};

export function krStockEnglishName(code: string): string | undefined {
    const symbol = code.toUpperCase();
    return Object.hasOwn(englishByCode, symbol) ? englishByCode[symbol] : undefined;
}

export function krStockJapaneseName(code: string): string | undefined {
    const symbol = code.toUpperCase();
    return Object.hasOwn(japaneseByCode, symbol) ? japaneseByCode[symbol] : undefined;
}

export function krStockDisplayName(code: string, originalName: string, locale: string): string {
    const english = krStockEnglishName(code);
    if (locale === 'ja') return krStockJapaneseName(code) || english || originalName;
    return locale === 'en' ? english || originalName : originalName;
}
