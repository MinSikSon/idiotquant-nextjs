import { createAppSlice } from "@/lib/createAppSlice";
import { getMarketInfo, getMarketInfoList, setMarketInfoList } from "./marketInfoAPI";

interface MarketInfo {
    state: "init"
    | "get-rejected"
    | "ready-marketInfoList"
    | "ready-marketInfo"
    | "pending" | "loaded" | "rejected";
    loaded: boolean;
    marketInfoList: string;
    latestDate: string;
    value: any;
}
const initialState: MarketInfo = {
    state: "init",
    loaded: false,
    marketInfoList: "",
    latestDate: "99999999",
    value: {}
}

export const marketInfoSlice = createAppSlice({
    name: "market",
    initialState,
    reducers: (create) => ({
        setMarketInfoStateLoading: create.reducer((state) => {
            state.state = "pending";
        }),
        getMarketList: create.asyncThunk(
            async () => {
                return await getMarketInfoList();
            },
            {
                pending: (state) => {
                    state.state = "pending";
                },
                fulfilled: (state, action) => {
                    if (!!action.payload) {
                        state.marketInfoList = action.payload;
                        state.state = "ready-marketInfoList";

                        const aMarketInfoList = String(action.payload).split(",");
                        const latestMarketInfoList = aMarketInfoList[aMarketInfoList.length - 1];
                        const splitLatestMarketInfoList = latestMarketInfoList.replaceAll("\"", "").replaceAll("[", "").replaceAll("]", "").split("_");
                        const date = splitLatestMarketInfoList[1];

                        state.latestDate = date;
                    }
                    else {
                        state.state = "get-rejected";
                    }
                },
                rejected: (state) => {
                    state.state = "get-rejected";
                }
            }
        ),
        setMarketList: create.asyncThunk(
            async (dateList: string[]) => { return await setMarketInfoList(dateList); },
            {
                pending: (state) => { state.state = "pending"; },
                fulfilled: (state, action) => {
                    state.marketInfoList = action.payload;
                    state.state = "ready-marketInfoList";
                },
                rejected: (state) => { state.state = "rejected"; }
            }
        ),
        initMarketInfo: create.asyncThunk(
            async ({ date }: { date: string }) => {
                // console.log(`[initMarketInfo]`, date);
                const res: any = await getMarketInfo(date); // 20230426
                return res;
            },
            {
                pending: (state) => {
                    // console.log(`[initMarketInfo] pending`);
                    state.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[initMarketInfo] fulfilled`, action.payload);
                    state.state = "ready-marketInfo";
                    state.loaded = true;
                    state.value = action.payload;
                },
                rejected: (state) => {
                    // console.log(`[initMarketInfo] rejected`);
                    state.state = "rejected";
                }
            }
        )
    }),
    selectors: {
        selectMarketInfoLoaded: (state) => state.loaded,
        selectMarketInfoState: (state) => state.state,
        selectMarketInfoList: (state) => state.marketInfoList,
        selectMarketInfoLatestDate: (state) => state.latestDate,
        selectMarketInfo: (state) => state.value,
    }
});


export const { setMarketInfoStateLoading } = marketInfoSlice.actions;
export const { initMarketInfo } = marketInfoSlice.actions;
export const { getMarketList, setMarketList } = marketInfoSlice.actions;
export const { selectMarketInfo, selectMarketInfoList, selectMarketInfoLoaded, selectMarketInfoState } = marketInfoSlice.selectors;
export const { selectMarketInfoLatestDate } = marketInfoSlice.selectors;
