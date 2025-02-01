import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";

interface StrategyStep0FilterInterface {
    title: string;
    subTitle: string;
    defaultStrategy: string;
    defaultStrategyList: string[];
}
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
    step0: StrategyStep0FilterInterface;
    step1: StrategyStep1FilterInterface;
    step2: StrategyStep2FilterInterface;
}

const initialState: StrategyFilterInterface = {
    totalStepCount: 3,
    step0: {
        title: "전략 선택",
        subTitle: "-",
        defaultStrategy: '-',
        defaultStrategyList: ['-', 'ncav'],

    },
    step1: {
        title: "PER, PBR",
        subTitle: "price earning ratio, price book value ratio",
        per: 5,
        perList: [5, 10, 15],
        pbr: 0.2,
        pbrList: [0.2, 0.4, 0.6, 0.8, 1.0],

    },
    step2: {
        title: "시가총액",
        subTitle: "주식수 * 주가",
        capitalization: 100000000000,
        capitalizationList: [100000000000, 1000000000000, 10000000000000]
    },
}

export const filterSlice = createAppSlice({
    name: "filter",
    initialState,
    reducers: (create) => ({
        setDefaultStrategy: create.reducer((state, action: PayloadAction<string>) => {
            // console.log(`[setDefaultStrategy]`)
            state.step0.defaultStrategy = action.payload;
        }),
        setPer: create.reducer((state, action: PayloadAction<number>) => {
            // console.log(`[setPer]`)
            state.step1.per = action.payload;
        }),
        setPbr: create.reducer((state, action: PayloadAction<number>) => {
            // console.log(`[setPbr]`)
            state.step1.pbr = action.payload;
        }),
        setCapitalization: create.reducer((state, action: PayloadAction<number>) => {
            // console.log(`[setCapitalization]`)
            state.step2.capitalization = action.payload;
        }),
    }),
    selectors: {
        getTotalStepCount: (state) => state.totalStepCount,
        getStep0Title: (state) => state.step0.title,
        getStep0SubTitle: (state) => state.step0.subTitle,
        getStep1Title: (state) => state.step1.title,
        getStep1SubTitle: (state) => state.step1.subTitle,
        getStep2Title: (state) => state.step2.title,
        getStep2SubTitle: (state) => state.step2.subTitle,
        getDefaultStrategy: (state) => state.step0.defaultStrategy,
        getDefaultStrategyList: (state) => state.step0.defaultStrategyList,
        getPer: (state) => state.step1.per,
        getPerList: (state) => state.step1.perList,
        getPbr: (state) => state.step1.pbr,
        getPbrList: (state) => state.step1.pbrList,
        getCapitalization: (state) => state.step2.capitalization,
        getCapitalizationList: (state) => state.step2.capitalizationList,
    }
});

export const { getTotalStepCount } = filterSlice.selectors;
export const { getStep0Title, getStep1Title, getStep2Title } = filterSlice.selectors;
export const { getStep0SubTitle, getStep1SubTitle, getStep2SubTitle } = filterSlice.selectors;
export const { getDefaultStrategy, getPer, getPbr, getCapitalization } = filterSlice.selectors;
export const { getDefaultStrategyList, getPerList, getPbrList, getCapitalizationList } = filterSlice.selectors;
export const { setDefaultStrategy, setPer, setPbr, setCapitalization } = filterSlice.actions;