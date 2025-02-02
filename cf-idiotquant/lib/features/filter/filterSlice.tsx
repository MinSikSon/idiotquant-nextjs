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
    per: any;
    perList: any[];
    pbr: any;
    pbrList: any[];
}
interface StrategyStep2FilterInterface {
    title: string;
    subTitle: string;
    capitalization: any;
    capitalizationList: any[];
}
interface StrategyStep3FilterInterface {
    title: string;
    subTitle: string;
    netIncome: boolean;
    netIncomeList: boolean[];
}

interface StrategyFilterInterface {
    totalStepCount: number;
    step0: StrategyStep0FilterInterface;
    step1: StrategyStep1FilterInterface;
    step2: StrategyStep2FilterInterface;
    step3: StrategyStep3FilterInterface;
}

const initialState: StrategyFilterInterface = {
    totalStepCount: 3,
    step0: {
        title: "전략 선택",
        subTitle: "-",
        defaultStrategy: '-',
        defaultStrategyList: ['-', 'NCAV'],

    },
    step1: {
        title: "PER, PBR",
        subTitle: "price earning ratio, price book value ratio",
        per: 'ALL',
        perList: ['ALL', 5, 10, 15],
        pbr: 'ALL',
        pbrList: ['ALL', 0.3, 0.6, 1.0],

    },
    step2: {
        title: "시가총액 최대",
        subTitle: "주식 수 * 주가",
        capitalization: 'ALL',
        capitalizationList: ['ALL', 100000000000, 1000000000000]
    },
    step3: {
        title: "당기순이익 고려",
        subTitle: "당기순이익 = 총수익 - 총비용 - 세금",
        netIncome: false,
        netIncomeList: [false, true]
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
        setPer: create.reducer((state, action: PayloadAction<any>) => {
            // console.log(`[setPer]`)
            state.step1.per = action.payload;
        }),
        setPbr: create.reducer((state, action: PayloadAction<any>) => {
            // console.log(`[setPbr]`)
            state.step1.pbr = action.payload;
        }),
        setCapitalization: create.reducer((state, action: PayloadAction<any>) => {
            // console.log(`[setCapitalization]`)
            state.step2.capitalization = action.payload;
        }),
        setNetIncome: create.reducer((state, action: PayloadAction<boolean>) => {
            // console.log(`[setCapitalization]`)
            state.step3.netIncome = action.payload;
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
        getStep3Title: (state) => state.step3.title,
        getStep3SubTitle: (state) => state.step3.subTitle,
        getDefaultStrategy: (state) => state.step0.defaultStrategy,
        getDefaultStrategyList: (state) => state.step0.defaultStrategyList,
        getPer: (state) => state.step1.per,
        getPerList: (state) => state.step1.perList,
        getPbr: (state) => state.step1.pbr,
        getPbrList: (state) => state.step1.pbrList,
        getCapitalization: (state) => state.step2.capitalization,
        getCapitalizationList: (state) => state.step2.capitalizationList,
        getNetIncome: (state) => state.step3.netIncome,
        getNetIncomeList: (state) => state.step3.netIncomeList,
    }
});

export const { getTotalStepCount } = filterSlice.selectors;
export const { getStep0Title, getStep1Title, getStep2Title, getStep3Title } = filterSlice.selectors;
export const { getStep0SubTitle, getStep1SubTitle, getStep2SubTitle, getStep3SubTitle } = filterSlice.selectors;
export const { getDefaultStrategy, getPer, getPbr, getCapitalization, getNetIncome } = filterSlice.selectors;
export const { getDefaultStrategyList, getPerList, getPbrList, getCapitalizationList, getNetIncomeList } = filterSlice.selectors;
export const { setDefaultStrategy, setPer, setPbr, setCapitalization, setNetIncome } = filterSlice.actions;
