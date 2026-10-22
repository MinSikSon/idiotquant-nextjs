const getChosung = (str: string) => {
    const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    let result = "";
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i) - 44032;
        if (code > -1 && code < 11172) {
            const choIdx = Math.floor(code / 588);
            result += CHO[choIdx];
        } else {
            result += str.charAt(i);
        }
    }
    return result;
};

const disassembleHangul = (str: string) => {
    const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    const JOONG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
    const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    let result = "";
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i) - 44032;
        if (code > -1 && code < 11172) {
            const choIdx = Math.floor(code / 588);
            const joongIdx = Math.floor((code % 588) / 28);
            const jongIdx = code % 28;
            result += CHO[choIdx] + JOONG[joongIdx] + (JONG[jongIdx] || "");
        } else {
            result += str.charAt(i);
        }
    }
    return result.toLowerCase();
};

export type StockSearchName = {
    symbol: string;
    name: string;
    koreanName?: string;
};

type SearchTerm = {
    lower: string;
    chosung: string;
    disassembled: string;
};

type SearchEntry = SearchTerm & { text: string; aliases: SearchTerm[] };

function searchTerm(text: string): SearchTerm {
    const lower = text.toLowerCase();
    return { lower, chosung: getChosung(lower), disassembled: disassembleHangul(lower) };
}

/** 목록이 바뀔 때만 한글 검색용 문자열을 준비한다. */
export function buildStockSearchIndex(names: readonly string[], stocks: readonly StockSearchName[] = []): SearchEntry[] {
    const entries = new Map(names.map(text => [text, { text, ...searchTerm(text), aliases: [] as SearchTerm[] }]));
    for (const stock of stocks) {
        const entry: SearchEntry = entries.get(stock.symbol) ?? { text: stock.symbol, ...searchTerm(stock.symbol), aliases: [] };
        const companyName = stock.name.replace(/\s+(?:INC|CORP|CORPORATION|LTD|LIMITED|PLC)\.?$/i, '');
        for (const name of new Set([stock.name, stock.koreanName, companyName])) {
            if (name) entry.aliases.push(searchTerm(name));
        }
        entries.set(stock.symbol, entry);
    }
    return [...entries.values()];
}

export function findStockSuggestions(index: readonly SearchEntry[], query: string): string[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];
    const disassembled = disassembleHangul(trimmed);
    const chosung = getChosung(trimmed);
    const initialsOnly = /^[ㄱ-ㅎ]+$/.test(trimmed);
    const matches = (item: SearchTerm) => item.lower.includes(trimmed) || (initialsOnly && item.chosung.includes(chosung)) || item.disassembled.includes(disassembled);
    const rank = (item: SearchEntry) => {
        if (item.lower === trimmed) return 0;
        if (item.aliases.some(alias => alias.lower === trimmed)) return 1;
        if (item.lower.startsWith(trimmed)) return 2;
        if (item.aliases.some(alias => alias.lower.startsWith(trimmed))) return 3;
        return 4;
    };
    return index.filter(item => matches(item) || item.aliases.some(matches)).sort((a, b) => {
        return rank(a) - rank(b) || a.text.length - b.text.length;
    }).slice(0, 10).map(item => item.text);
}
