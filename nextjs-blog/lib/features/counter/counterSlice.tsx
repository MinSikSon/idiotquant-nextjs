import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";

interface Count {
    value: number;
}
const initialState: Count = {
    value: 0
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
        })
    }),
    selectors: {
        selectCount: (counter) => counter.value,
    }
})

export const { initializeCount, plus, minus } = counterSlice.actions;
export const { selectCount } = counterSlice.selectors;