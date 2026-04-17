import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getSample, postSample } from "./sampleAPI";

interface SampleData{
    state: "init" | "pending" | "fulfilled" | "rejected";
    data1:any;
    data2:any;
}

interface Sample {
    state: "init" | "pending" | "fulfilled" | "rejected";
    sampleData:SampleData;
}

const initialState: Sample = {
    state: "init",
    sampleData: {
        state:"init",
        data1:"",
        data2:""
    }
}

export const timestampSlice = createAppSlice({
    name: "timestamp",
    initialState,
    reducers: (create) => ({
        reqPostSample: create.asyncThunk(
            async (data: any) => {
                return await postSample(data);
            },
            {
                pending: (state) => {
                    console.log(`[sampleData] pending`);
                    state.sampleData.state = "pending"
                },
                fulfilled: (state, action) => {
                    console.log(`[sampleData] fulfilled`, `, typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
                    state.sampleData.state = "fulfilled";
                    state.sampleData.data1 = action.payload;
                    state.sampleData.data2 = action.payload;
                },
                rejected: (state) => {
                    console.log(`[sampleData] rejected`);
                    state.sampleData.state = "rejected"
                }
            }
        ),
        reqGetSample: create.asyncThunk(
            async (count: string) => {
                return await getSample(count);
            },
            {
                pending: (state) => {
                    // console.log(`[getTimestampList] pending`);
                    state.sampleData.state = "pending"
                },
                fulfilled: (state, action) => {
                    // console.log(`[getTimestampList] fulfilled`, `, typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
                    state.sampleData.state = "fulfilled";
                    state.sampleData.data1 = action.payload;
                    state.sampleData.data2 = action.payload;
                },
                rejected: (state) => {
                    // console.log(`[getTimestampList] rejected`);
                    state.sampleData.state = "rejected"
                }
            }
        ),
    }),
    selectors: {
        selectData1: (state) => state.sampleData.data1,
        selectSampleData: (state) => state.sampleData,
    }
});

export const { reqGetSample, reqPostSample } = timestampSlice.actions;
export const { selectData1, selectSampleData } = timestampSlice.selectors;
