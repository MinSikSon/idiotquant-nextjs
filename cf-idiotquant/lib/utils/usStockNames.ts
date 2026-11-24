import { useEffect, useState } from "react";
import { loadUsStockNames } from "./stockSearchData";
import type { StockSearchName } from "./stockSuggestions";

let directoryPromise: Promise<ReadonlyMap<string, StockSearchName>> | undefined;

export function useUsStockDirectory(enabled = true) {
    const [directory, setDirectory] = useState<ReadonlyMap<string, StockSearchName>>();
    useEffect(() => {
        if (!enabled || directory) return;
        let active = true;
        directoryPromise ??= loadUsStockNames()
            .then(stocks => new Map(stocks.map(stock => [stock.symbol.toUpperCase(), stock])))
            .catch(error => { directoryPromise = undefined; throw error; });
        void directoryPromise.then(names => { if (active) setDirectory(names); }).catch(() => {});
        return () => { active = false; };
    }, [enabled, directory]);
    return directory;
}

export function usStockDisplayName(stock: StockSearchName | undefined, originalName: string, locale: string): string {
    if (!stock) return originalName;
    if (locale !== "ko") return stock.name;
    return stock.koreanName || (originalName === stock.symbol ? stock.name : originalName);
}
