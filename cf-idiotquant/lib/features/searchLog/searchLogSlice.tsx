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
            async (data: Parameters<typeof postSearchLog>[0]) => {
                const result = await postSearchLog(data);
                if (result?.success === false) throw new Error(result.error || '검색 기록 저장 실패');
                return result;
            },
            {
                pending: (state) => { state.postStatus = "pending"; },
                fulfilled: (state) => { state.postStatus = "fulfilled"; },
                rejected: (state) => { state.postStatus = "rejected"; }
            }
        ),
        reqGetSearchLog: create.asyncThunk(
            async (count: string) => {
                const result = await getSearchLog(count);
                if (result?.success === false) throw new Error(result.error || '인기 검색 조회 실패');
                return result;
            },
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
