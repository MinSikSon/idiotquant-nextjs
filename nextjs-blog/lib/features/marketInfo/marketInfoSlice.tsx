import { createAppSlice } from "@/lib/createAppSlice";
import { getMarketInfo, getMarketInfoList, setMarketInfoList } from "./marketInfoAPI";

interface MarketInfo {
    state: "init"
    | "get-rejected"
    | "ready-marketInfoList"
    | "loading" | "loaded" | "rejected";
    loaded: boolean;
    marketInfoList: string[];
    value: any;
}
const initialState: MarketInfo = {
    state: "init",
    loaded: false,
    marketInfoList: [],
    value: {}
}

export const marketInfoSlice = createAppSlice({
    name: "market",
    initialState,
    reducers: (create) => ({
        getMarketList: create.asyncThunk(
            async () => { return await getMarketInfoList(); },
            {
                pending: (state) => {
                    // console.log(`[getMarketList] pending`);
                    state.state = "loading";
                },
                fulfilled: (state, action) => {
                    // console.log(`[getMarketList] fulfilled`, action.payload, !!action.payload);
                    if (!!action.payload) {
                        state.marketInfoList = action.payload;
                        state.state = "ready-marketInfoList";
                    }
                    else {
                        state.state = "get-rejected";
                    }
                },
                rejected: (state) => {
                    // console.log(`[getMarketList] rejected`);
                    state.state = "get-rejected";
                }
            }
        ),
        setMarketList: create.asyncThunk(
            async (dateList: string[]) => { return await setMarketInfoList(dateList); },
            {
                pending: (state) => { state.state = "loading"; },
                fulfilled: (state, action) => {
                    state.marketInfoList = action.payload;
                    state.state = "ready-marketInfoList";
                },
                rejected: (state) => { state.state = "rejected"; }
            }
        ),
        initMarketInfo: create.asyncThunk(
            async ({ date }: { date: string }) => {
                const res: any = await getMarketInfo(date); // 20230426
                return res;
            },
            {
                pending: (state) => {
                    // console.log(`pending`);
                    state.state = "loading";
                    state.loaded = true;
                },
                fulfilled: (state, action) => {
                    // console.log(`fulfilled`);
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
        selectMarketInfoState: (state) => state.state,
        selectMarketInfoList: (state) => state.marketInfoList,
        selectMarketInfo: (state) => state.value,
    }
});

export const { initMarketInfo } = marketInfoSlice.actions;
export const { getMarketList, setMarketList } = marketInfoSlice.actions;
export const { selectMarketInfo, selectMarketInfoList, selectMarketInfoLoaded, selectMarketInfoState } = marketInfoSlice.selectors;