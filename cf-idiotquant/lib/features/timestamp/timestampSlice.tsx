import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { postTimestamp } from "./timestampAPI";

// setTimestamp
interface Timestamp {
    state: "init"
    | "pending" | "fulfilled" | "rejected";
    data: any;
}

const initialState: Timestamp = {
    state: "init",
    data: {},
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
                    state.state = "pending"
                },
                fulfilled: (state, action) => {
                    console.log(`[setTimestamp] fulfilled`, `, typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
                    state.state = "fulfilled";
                    state.data = action.payload;
                },
                rejected: (state) => {
                    console.log(`[setTimestamp] rejected`);
                    state.state = "rejected"
                }
            }
        ),
    }),
    selectors: {
        selectTimestamp: (state) => state.data,
    }
});

export const { setTimestamp } = timestampSlice.actions;
export const { selectTimestamp } = timestampSlice.selectors;
