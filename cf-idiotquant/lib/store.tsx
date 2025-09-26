import { Action, combineSlices, configureStore, ThunkAction } from "@reduxjs/toolkit"
import { financialInfoSlice } from "./features/financialInfo/financialInfoSlice";
import { marketInfoSlice } from "./features/marketInfo/marketInfoSlice";
import { articleSlice } from "./features/article/articleSlice";
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
import { aiSlice } from "./features/ai/aiSlice";
import { aiStreamSlice } from "./features/ai/aiStreamSlice";
import { searchHistorySlice } from "./features/searchHistory/searchHistorySlice";
import { timestampSlice } from "./features/timestamp/timestampSlice";

const rootReducer: any = combineSlices(
    financialInfoSlice,
    marketInfoSlice,
    articleSlice,
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
    aiSlice,
    aiStreamSlice,
    searchHistorySlice,
    timestampSlice,
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