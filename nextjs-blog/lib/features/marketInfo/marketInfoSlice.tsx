import { createAppSlice } from "@/lib/createAppSlice";
import { getMarketInfo } from "./marketInfoAPI";

interface MarketInfo {
    state: "loading" | "loaded" | "rejected";
    loaded: boolean;
    value: any;
}
const initialState: MarketInfo = {
    state: "loading",
    loaded: false,
    value: {}
}

export const marketInfoSlice = createAppSlice({
    name: "market",
    initialState,
    reducers: (create) => ({
        initMarketInfo: create.asyncThunk(
            async ({ date }: { date: string }) => {
                const res: any = await getMarketInfo(date); // 20230426
                return res;
            },
            {
                pending: (state) => {
                    console.log(`pending`);
                    state.state = "loading";
                    state.loaded = true;
                },
                fulfilled: (state, action) => {
                    console.log(`fulfilled`);
                    state.state = "loaded";
                    state.loaded = true;
                    state.value = action.payload;
                },
                rejected: (state) => {
                    console.log(`rejected`);
                    state.state = "rejected";
                }
            }
        )
    }),
    selectors: {
        selectMarketInfoLoaded: (state) => state.loaded,
        selectMarketInfo: (state) => state.value,
    }
});

export const { initMarketInfo } = marketInfoSlice.actions;
export const { selectMarketInfoLoaded, selectMarketInfo } = marketInfoSlice.selectors;