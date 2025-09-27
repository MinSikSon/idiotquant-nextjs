import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getTimestampList, postTimestamp } from "./timestampAPI";

interface TimestampList {
    state: "init"
    | "pending" | "fulfilled" | "rejected";
    data: any;
}

interface CurrentTimestamp {
    state: "init"
    | "pending" | "fulfilled" | "rejected";
    data: any;
}
// setTimestamp
interface Timestamp {
    state: "init"
    | "pending" | "fulfilled" | "rejected";
    timestamp: CurrentTimestamp;
    prevTimestampList: TimestampList;
}

const initialState: Timestamp = {
    state: "init",
    timestamp: {
        state: "init",
        data: undefined
    },
    prevTimestampList: {
        state: "init",
        data: undefined
    }
}

export const timestampSlice = createAppSlice({
    name: "timestamp",
    initialState,
    reducers: (create) => ({
        setTimestamp: create.asyncThunk(
            async (data: any) => {
                return await postTimestamp(data);
            },
            {
                pending: (state) => {
                    console.log(`[setTimestamp] pending`);
                    state.timestamp.state = "pending"
                },
                fulfilled: (state, action) => {
                    console.log(`[setTimestamp] fulfilled`, `, typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
                    state.timestamp.state = "fulfilled";
                    state.timestamp.data = action.payload;
                },
                rejected: (state) => {
                    console.log(`[setTimestamp] rejected`);
                    state.timestamp.state = "rejected"
                }
            }
        ),
        queryTimestampList: create.asyncThunk(
            async (count: string) => {
                return await getTimestampList(count);
            },
            {
                pending: (state) => {
                    console.log(`[getTimestampList] pending`);
                    state.prevTimestampList.state = "pending"
                },
                fulfilled: (state, action) => {
                    console.log(`[getTimestampList] fulfilled`, `, typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
                    state.prevTimestampList.state = "fulfilled";
                    state.prevTimestampList.data = action.payload;
                },
                rejected: (state) => {
                    console.log(`[getTimestampList] rejected`);
                    state.prevTimestampList.state = "rejected"
                }
            }
        ),
    }),
    selectors: {
        selectTimestamp: (state) => state.timestamp.data,
        selectTimestampList: (state) => state.prevTimestampList,
    }
});

export const { setTimestamp, queryTimestampList } = timestampSlice.actions;
export const { selectTimestamp, selectTimestampList } = timestampSlice.selectors;
