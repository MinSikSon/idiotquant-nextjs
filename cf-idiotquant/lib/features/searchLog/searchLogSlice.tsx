import { createAppSlice } from "@/lib/createAppSlice";
import { getSearchLog, postSearchLog } from "./searchLogAPI";

interface SearchLogState {
    getStatus: "init" | "pending" | "fulfilled" | "rejected";
    postStatus: "init" | "pending" | "fulfilled" | "rejected";
    popularStocks: any[];
}

const initialState: SearchLogState = {
    getStatus: "init",
    postStatus: "init",
    popularStocks: []
};

export const searchLogSlice = createAppSlice({
    name: "searchLog",
    initialState,
    reducers: (create) => ({
        reqPostSearchLog: create.asyncThunk(
            async (data: any) => await postSearchLog(data),
            {
                pending: (state) => { state.postStatus = "pending"; },
                fulfilled: (state) => { state.postStatus = "fulfilled"; },
                rejected: (state) => { state.postStatus = "rejected"; }
            }
        ),
        reqGetSearchLog: create.asyncThunk(
            async (count: string) => await getSearchLog(count),
            {
                pending: (state) => { state.getStatus = "pending"; },
                fulfilled: (state, action) => {
                    state.getStatus = "fulfilled";
                    state.popularStocks = Array.isArray(action.payload) ? action.payload : [];
                },
                rejected: (state) => { state.getStatus = "rejected"; }
            }
        ),
    }),
    selectors: {
        selectPopularStocks: (state) => state.popularStocks,
        selectSearchLogStatus: (state) => state.getStatus
    }
});

export const { reqGetSearchLog, reqPostSearchLog } = searchLogSlice.actions;
export const { selectPopularStocks, selectSearchLogStatus } = searchLogSlice.selectors;