import { Action, combineSlices, configureStore, ThunkAction } from "@reduxjs/toolkit"
import { financialInfoSlice } from "./features/financialInfo/financialInfoSlice";
import { marketInfoSlice } from "./features/marketInfo/marketInfoSlice";
import { articleSlice } from "./features/article/articleSlice";
import { strategySlice } from "./features/strategy/strategySlice";
import { backtestSlice } from "./features/backtest/backtestSlice";
import { loginSlice } from "./features/login/loginSlice";

const rootReducer: any = combineSlices(
    financialInfoSlice,
    marketInfoSlice,
    articleSlice,
    strategySlice,
    backtestSlice,
    loginSlice
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