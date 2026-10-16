import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ComparisonPrice = { price?: number; priceDate?: string; loading?: boolean; error?: string };
export type ComparisonStock = {
  id: string; name: string; ticker: string; market: 'KR' | 'US';
  currentShares?: number;
  prices: Record<string, ComparisonPrice>;
  per?: number; pbr?: number; eps?: number; bps?: number; roe?: number; currency: string;
};

type CompareState = {
  query: string;
  dateInput: string;
  dates: string[];
  stocks: ComparisonStock[];
  loading: boolean;
  dateLoading: boolean;
  error: string;
  importProgress: { loaded: number; total: number } | null;
  importSource: string | null;
};

const initialState: CompareState = {
  query: '', dateInput: '', dates: [], stocks: [], loading: false,
  dateLoading: false, error: '', importProgress: null, importSource: null,
};

// 루트 StoreProvider에 보관하므로 페이지 이동 중에 끝난 조회도 비교표에 반영된다.
export const compareSlice = createSlice({
  name: 'compare',
  initialState,
  reducers: {
    setQuery(state, action: PayloadAction<string>) { state.query = action.payload; },
    setDateInput(state, action: PayloadAction<string>) { state.dateInput = action.payload; },
    setError(state, action: PayloadAction<string>) { state.error = action.payload; },
    stockLoadStarted(state) { state.loading = true; state.error = ''; },
    stockReceived(state, action: PayloadAction<{ stock: ComparisonStock; limit: number }>) {
      const { stock, limit } = action.payload;
      if (state.stocks.length < limit && !state.stocks.some(item => item.market === stock.market && item.ticker === stock.ticker)) {
        state.stocks.push(stock);
      }
    },
    stockLoadFinished(state) { state.loading = false; },
    dateLoadStarted(state, action: PayloadAction<string>) {
      state.error = '';
      state.dateLoading = true;
      state.dates = [...state.dates, action.payload].sort();
      for (const stock of state.stocks) stock.prices[action.payload] = { loading: true };
    },
    datePriceReceived(state, action: PayloadAction<{ id: string; date: string; price: ComparisonPrice }>) {
      const { id, date, price } = action.payload;
      const stock = state.stocks.find(item => item.id === id);
      if (stock?.prices[date]?.loading) stock.prices[date] = price;
    },
    dateLoadFinished(state) { state.dateLoading = false; },
    removeDate(state, action: PayloadAction<string>) {
      state.dates = state.dates.filter(date => date !== action.payload);
      for (const stock of state.stocks) delete stock.prices[action.payload];
    },
    removeStock(state, action: PayloadAction<string>) {
      state.stocks = state.stocks.filter(stock => stock.id !== action.payload);
    },
    applyLimits(state, action: PayloadAction<{ dates: number; stocks: number }>) {
      state.dates = state.dates.slice(0, action.payload.dates);
      state.stocks = state.stocks.slice(0, action.payload.stocks);
    },
    importStarted(state, action: PayloadAction<{ source: string; date: string; total: number }>) {
      return {
        ...initialState, importSource: action.payload.source, dateInput: action.payload.date,
        dates: [action.payload.date], loading: true, importProgress: { loaded: 0, total: action.payload.total },
      };
    },
    importAdvanced(state, action: PayloadAction<number>) {
      if (state.importProgress) state.importProgress.loaded = action.payload;
    },
    importFinished(state) { state.loading = false; state.importProgress = null; },
    clearComparison(state) {
      // 같은 스크리너 링크로 돌아와도 비운 결과를 자동으로 다시 채우지 않는다.
      return { ...initialState, importSource: state.importSource };
    },
  },
  selectors: { selectComparison: state => state },
});

export const {
  setQuery, setDateInput, setError, stockLoadStarted, stockReceived, stockLoadFinished,
  dateLoadStarted, datePriceReceived, dateLoadFinished, removeDate, removeStock, applyLimits,
  importStarted, importAdvanced, importFinished, clearComparison,
} = compareSlice.actions;
export const { selectComparison } = compareSlice.selectors;
