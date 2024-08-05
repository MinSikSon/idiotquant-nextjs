import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";

interface Count {
    value: number;
    stockCount: number;
    realRateOfReturn: number;
}
const initialState: Count = {
    value: 0,
    stockCount: 0,
    realRateOfReturn: 0,

}
export const counterSlice = createAppSlice({
    name: "counter",
    initialState,
    reducers: (create) => ({
        initializeCount: create.reducer((state, action: PayloadAction<number>) => {
            state.value = action.payload;
        }),
        plus: create.reducer((state) => {
            state.value += 1;
        }),
        minus: create.reducer((state) => {
            state.value -= 1;
        }),

        setStockCount: create.reducer((state, action: PayloadAction<number>) => {
            state.stockCount = action.payload;
        }),
        setCummulate: create.reducer((state, action: PayloadAction<number>) => {
            state.realRateOfReturn = action.payload;
        }),
    }),
    selectors: {
        selectCount: (counter) => counter.value,

        selectStockCount: (counter) => counter.stockCount,
        selectRealRateOfReturn: (counter) => counter.realRateOfReturn,
    }
})

export const { setStockCount, setCummulate } = counterSlice.actions;
export const { selectStockCount, selectRealRateOfReturn } = counterSlice.selectors;