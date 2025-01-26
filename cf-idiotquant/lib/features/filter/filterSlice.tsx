import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";

interface StrategyStep1FilterInterface {
    title: string;
    subTitle: string;
    per: number;
    perList: number[];
    pbr: number;
    pbrList: number[];
}
interface StrategyStep2FilterInterface {
    title: string;
    subTitle: string;
    capitalization: number;
    capitalizationList: number[];
}

interface StrategyFilterInterface {
    totalStepCount: number;
    step0: StrategyStep1FilterInterface;
    step1: StrategyStep2FilterInterface;
}

const initialState: StrategyFilterInterface = {
    totalStepCount: 2,
    step0: {
        title: "PER, PBR",
        subTitle: "price earning ratio, price book value ratio",
        per: 0,
        perList: [5, 10, 15],
        pbr: 0,
        pbrList: [0.2, 0.4, 0.6, 0.8, 1.0],

    },
    step1: {
        title: "시가총액",
        subTitle: "주식수 * 주가",
        capitalization: 0,
        capitalizationList: [100000000000, 1000000000000, 10000000000000]
    },
}

export const filterSlice = createAppSlice({
    name: "filter",
    initialState,
    reducers: (create) => ({
        setPer: create.reducer((state, action: PayloadAction<number>) => {
            // console.log(`[setPer]`)
            state.step0.per = action.payload;
        }),
        setPbr: create.reducer((state, action: PayloadAction<number>) => {
            // console.log(`[setPbr]`)
            state.step0.pbr = action.payload;
        }),
        setCapitalization: create.reducer((state, action: PayloadAction<number>) => {
            // console.log(`[setCapitalization]`)
            state.step1.capitalization = action.payload;
        }),
    }),
    selectors: {
        getTotalStepCount: (state) => state.totalStepCount,
        getStep0Title: (state) => state.step0.title,
        getStep0SubTitle: (state) => state.step0.subTitle,
        getStep1Title: (state) => state.step1.title,
        getStep1SubTitle: (state) => state.step1.subTitle,
        getPer: (state) => state.step0.per,
        getPerList: (state) => state.step0.perList,
        getPbr: (state) => state.step0.pbr,
        getPbrList: (state) => state.step0.pbrList,
        getCapitalization: (state) => state.step1.capitalization,
        getCapitalizationList: (state) => state.step1.capitalizationList,
    }
});

export const { getTotalStepCount } = filterSlice.selectors;
export const { getStep0Title, getStep1Title } = filterSlice.selectors;
export const { getStep0SubTitle, getStep1SubTitle } = filterSlice.selectors;
export const { getPer, getPbr, getCapitalization } = filterSlice.selectors;
export const { getPerList, getPbrList, getCapitalizationList } = filterSlice.selectors;
export const { setPer, setPbr, setCapitalization } = filterSlice.actions;