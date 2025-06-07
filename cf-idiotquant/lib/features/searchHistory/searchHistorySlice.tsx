import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";

interface SearchHistory {
    krMarketHistory: string[];
    usMarketHistory: string[];
}
const initialState: SearchHistory = {
    krMarketHistory: [],
    usMarketHistory: [],
}

export const searchHistorySlice = createAppSlice({
    name: "search_history",
    initialState,
    reducers: (create) => ({
        addKrMarketHistory: create.reducer((state, action: PayloadAction<string>) => {
            state.krMarketHistory = [...state.krMarketHistory, action.payload];
        }),
        addUsMarketHistory: create.reducer((state, action: PayloadAction<string>) => {
            state.usMarketHistory = [...state.usMarketHistory, action.payload];
        }),

    }),
    selectors: {
        selectKrMarketHistory: (state) => state.krMarketHistory,
        selectUsMarketHistory: (state) => state.usMarketHistory,
    }
})

export const { addKrMarketHistory, addUsMarketHistory } = searchHistorySlice.actions;
export const { selectKrMarketHistory, selectUsMarketHistory } = searchHistorySlice.selectors;