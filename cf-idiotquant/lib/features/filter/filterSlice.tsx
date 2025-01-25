import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
// import { setNcavList, getNcavList } from "./filterAPI";
import { Example8TableHeadType, Example8TableRowType } from "@/components/tableExample8";

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
        // getStrategyList: create.asyncThunk(
        //     async ({ financialInfoDate, marketInfoDate }: { financialInfoDate: string, marketInfoDate: string }) => {
        //         // console.log(`[getStrategyList]`, financialInfoDate, marketInfoDate);
        //         const res: any = await getNcavList(financialInfoDate, marketInfoDate);
        //         // console.log(`[getStrategyList] res`, res);
        //         return res;
        //     },
        //     {
        //         pending: (state) => {
        //             // console.log(`[getStrategyList] pending`);
        //             state.state = "loading";
        //         },
        //         fulfilled: (state, action) => {
        //             const nextState = "loaded";
        //             // console.log(`[getStrategyList]`, nextState, action.payload);
        //             state.state = nextState;
        //             const json = action.payload;

        //             state.value = json;
        //             // console.log(`[getStrategyList] json`, json);

        //             // state.date = marketInfoDate;
        //             const tableRow = translateJsonToTableRow(json);
        //             state.STRATEGY_TABLE_ROW = tableRow
        //             state.strategyList.push(tableRow);
        //         },
        //         rejected: (state) => {
        //             const nextState = "get-rejected";
        //             // console.log(`[getStrategyList]`, nextState);
        //             state.state = nextState;
        //         }
        //     },
        // ),
        // setStrategyList: create.asyncThunk(
        //     async ({ financialInfoDate, marketInfoDate, ncavList }: { financialInfoDate: string, marketInfoDate: string, ncavList: string }) => {
        //         // console.log(`[setStrategyList]`, financialInfoDate, marketInfoDate, ncavList);
        //         const res: any = await setNcavList(financialInfoDate, marketInfoDate, ncavList);
        //         // console.log(`[setStrategyList] res`, res);
        //         return { 'res': res, 'financial_date': financialInfoDate, 'market_date': marketInfoDate };
        //     },
        //     {
        //         pending: (state) => {
        //             const nextState = "loading";
        //             // console.log(`[setStrategyList]`, nextState);
        //             state.state = "loading";
        //         },
        //         fulfilled: (state, action) => {
        //             const nextState = "loaded";
        //             // console.log(`[setStrategyList]`, nextState);
        //             state.state = nextState;

        //             const json = JSON.parse(action.payload['res']);
        //             // console.log(`[setStrategyList] res`, json);

        //             const financial_date = action.payload['financial_date'];
        //             state.financial_date = financial_date;
        //             // console.log(`[setStrategyList] market_date`, financial_date);
        //             const market_date = action.payload['market_date'];
        //             state.market_date = market_date;
        //             // console.log(`[setStrategyList] market_date`, market_date);

        //             const tableRow = translateJsonToTableRow(json);
        //             state.STRATEGY_TABLE_ROW = tableRow
        //             state.value = json;
        //             state.strategyList.push(tableRow);
        //         },
        //         rejected: (state) => {
        //             const nextState = "set-rejected";
        //             // console.log(`[setStrategyList]`, nextState);
        //             state.state = nextState;
        //         }
        //     },
        // )
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
        // selectNcavList: (state) => state.value,
        // selectStrategyState: (state) => state.state,
        // selectStrategyTableRow: (state) => state.STRATEGY_TABLE_ROW,
        // selectStrategyFinancialDate: (state) => state.financial_date,
        // selectStrategyMarketDate: (state) => state.market_date,

        // selectStrategyList: (state) => state.strategyList,
    }
});

export const { getTotalStepCount } = filterSlice.selectors;
export const { getStep0Title, getStep1Title } = filterSlice.selectors;
export const { getStep0SubTitle, getStep1SubTitle } = filterSlice.selectors;
export const { getPer, getPbr, getCapitalization } = filterSlice.selectors;
export const { getPerList, getPbrList, getCapitalizationList } = filterSlice.selectors;
export const { setPer, setPbr, setCapitalization } = filterSlice.actions;
// export const { getStrategyList, setStrategyList, setLoading, setRetry } = strategySlice.actions;
// export const { selectNcavList, selectStrategyState, selectStrategyTableRow, selectStrategyFinancialDate, selectStrategyMarketDate, selectStrategyList } = strategySlice.selectors;