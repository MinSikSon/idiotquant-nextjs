import { Action, combineSlices, configureStore, ThunkAction } from "@reduxjs/toolkit"
import { financialInfoSlice } from "./features/financialInfo/financialInfoSlice";
import { marketInfoSlice } from "./features/marketInfo/marketInfoSlice";
import { strategySlice } from "./features/strategy/strategySlice";
import { backtestSlice } from "./features/backtest/backtestSlice";
import { loginSlice } from "./features/login/loginSlice";
import { kakaoSlice } from "./features/kakao/kakaoSlice";
import { cloudflareSlice } from "./features/cloudflare/cloudflareSlice";
import { filterSlice } from "./features/filter/filterSlice";
import { koreaInvestmentSlice } from "./features/koreaInvestment/koreaInvestmentSlice";
import { koreaInvestmentUsMarketSlice } from "./features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";
import { algorithmTradeSlice } from "./features/algorithmTrade/algorithmTradeSlice";
import { fmpUsMarketSlice } from "./features/fmpUsMarket/fmpUsMarketSlice";
import { finnhubUsMarketSlice } from "./features/finnhubUsMarket/finnhubUsMarketSlice";
import { aiSlice } from "./features/ai/aiSlice";
import { aiStreamSlice } from "./features/ai/aiStreamSlice";
import { searchHistorySlice } from "./features/searchHistory/searchHistorySlice";
import { timestampSlice } from "./features/timestamp/timestampSlice";
import { controlSlice } from "./features/control/controlSlice";
import { capitalSlice } from "./features/capital/capitalSlice";

const rootReducer: any = combineSlices(
    financialInfoSlice,
    marketInfoSlice,
    strategySlice,
    backtestSlice,
    loginSlice,
    kakaoSlice,
    cloudflareSlice,
    filterSlice,
    koreaInvestmentSlice,
    koreaInvestmentUsMarketSlice,
    algorithmTradeSlice,
    fmpUsMarketSlice,
    finnhubUsMarketSlice,
    aiSlice,
    aiStreamSlice,
    searchHistorySlice,
    timestampSlice,
    controlSlice,
    capitalSlice
);

export type RootState = ReturnType<typeof rootReducer>;

export const makeStore = () => {
    return configureStore({
        reducer: rootReducer,
    });
}

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type AppDispatch = AppStore["dispatch"];
export type AppThunk<ThunkReturnType = void> = ThunkAction<
    ThunkReturnType,
    RootState,
    unknown,
    Action
>;