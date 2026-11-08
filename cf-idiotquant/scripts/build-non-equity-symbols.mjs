// Rebuild after updating the exchange symbol metadata: node --experimental-strip-types --import ./test/register.mjs scripts/build-non-equity-symbols.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { isNonEquityName } from '../lib/utils/stockValuationEligibility.ts';

const root = new URL('../public/data/usStockSymbols/', import.meta.url);
const lists = await Promise.all(['nasdaq', 'nyse', 'amex'].map(async market =>
    JSON.parse(await readFile(new URL(`${market}_full_tickers.json`, root), 'utf8'))));
const symbols = [...new Set(lists.flat().filter(item => isNonEquityName(`${item.name} ${item.koreanName ?? ''}`))
    .map(item => item.symbol.trim().toUpperCase()))].sort();
await writeFile(new URL('non_equity_symbols.json', root), `${JSON.stringify(symbols, null, 2)}\n`);
console.log(`${symbols.length} non-equity symbols`);
