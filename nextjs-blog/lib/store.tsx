import { Action, combineSlices, configureStore, ThunkAction } from "@reduxjs/toolkit"
import { counterSlice } from "./features/counter/counterSlice";
import { financialInfoSlice } from "./features/stock/financialInfoSlice";

const rootReducer: any = combineSlices(counterSlice, financialInfoSlice);
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

export const API_URL = "https://idiotquant-backend.tofu89223.workers.dev";