import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";

interface Control {
    value: number;
    stockCount: number;
    realRateOfReturn: number;
    theme: "light" | "dark";
}
const initialState: Control = {
    value: 0,
    stockCount: 0,
    realRateOfReturn: 0,
    // theme: "light",
    theme: "dark",

}
export const controlSlice = createAppSlice({
    name: "control",
    initialState,
    reducers: (create) => ({
        setTheme: create.reducer<"light" | "dark">((state, action: PayloadAction<"light" | "dark">) => {
            state.theme = action.payload;
        }),
    }),
    selectors: {
        selectTheme: (counter) => counter.theme,
    }
})

export const { setTheme } = controlSlice.actions;
export const { selectTheme } = controlSlice.selectors;