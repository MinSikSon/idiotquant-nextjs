import { createAppSlice } from "@/lib/createAppSlice";
import { getFinancialInfo, getFinancialInfoList, setFinancialInfoList } from "./financialInfoAPI";



interface LatestFinancialDate {
    year: string;
    quarter: string;
}
interface FinancialInfo {
    state: "init"
    | "get-rejected"
    | "ready-financialInfoList"
    | "ready-financialInfo"
    | "loading" | "loaded" | "rejected";
    loaded: boolean;
    financialInfoList: string[];
    latestDate: LatestFinancialDate;
    value: any;
}
const initialState: FinancialInfo = {
    state: "init",
    loaded: false,
    financialInfoList: [],
    latestDate: { year: "9999", quarter: "0" },
    value: {},
}

export const financialInfoSlice = createAppSlice({
    name: "financial",
    initialState,
    reducers: (create) => ({
        setStateLoading: create.reducer((state) => {
            state.state = "loading";
        }),
        getList: create.asyncThunk(
            async () => { return await getFinancialInfoList(); },
            {
                pending: (state) => {
                    console.log(`loading`);
                    state.state = "loading";
                },
                fulfilled: (state, action) => {
                    // console.log(`[getList] fulfilled`, action.payload, !!action.payload);
                    if (!!action.payload) {
                        console.log(`ready-financialInfoList`);
                        state.financialInfoList = action.payload;

                        const afinancialInfoList = String(action.payload).split(",");
                        const latestFinancialInfoList = afinancialInfoList[afinancialInfoList.length - 1];
                        const splitLatestFinancialInfoList = latestFinancialInfoList.replaceAll("\"", "").replaceAll("[", "").replaceAll("]", "").split("_");
                        const year = splitLatestFinancialInfoList[1];
                        const quarter = splitLatestFinancialInfoList[2].replace("Q", "");
                        state.latestDate = { year, quarter };
                        state.state = "ready-financialInfoList";
                    }
                    else {
                        console.log(`get-rejected 1`);
                        state.state = "get-rejected";
                    }
                },
                rejected: (state) => {
                    console.log(`get-rejected 2`);
                    state.state = "get-rejected";
                }
            }
        ),
        setList: create.asyncThunk(
            async (dateList: string[]) => { return await setFinancialInfoList(dateList); },
            {
                pending: (state) => { state.state = "loading"; },
                fulfilled: (state, action) => {
                    state.financialInfoList = action.payload;
                    state.state = "ready-financialInfoList";
                },
                rejected: (state) => { state.state = "rejected"; }
            }
        ),
        initFinancialInfo: create.asyncThunk(
            async ({ year, quarter }: { year: string, quarter: string }) => {
                const res: any = await getFinancialInfo(year, quarter);
                // const res = "empty";
                return res;
            },
            {
                pending: (state) => {
                    console.log(`loading`);
                    state.state = "loading";
                    state.loaded = true;
                },
                fulfilled: (state, action) => {
                    console.log(`ready-financialInfo`);
                    state.value = action.payload;
                    state.loaded = true;
                    state.state = "ready-financialInfo";
                },
                rejected: (state) => {
                    console.log(`rejected`);
                    state.state = "rejected";
                }
            }
        ),
    }),
    selectors: {
        selectLoaded: (state) => state.loaded,
        selectFinancialInfoState: (state) => state.state,
        selectFinancialInfoList: (state) => state.financialInfoList,
        selectFinancialInfo: (state) => state.value,
        selectLatestDate: (state) => state.latestDate,
    }
});

export const { setStateLoading } = financialInfoSlice.actions;
export const { initFinancialInfo } = financialInfoSlice.actions;
export const { getList, setList } = financialInfoSlice.actions;
export const { selectFinancialInfo, selectFinancialInfoList, selectLoaded, selectFinancialInfoState } = financialInfoSlice.selectors;
export const { selectLatestDate } = financialInfoSlice.selectors;
