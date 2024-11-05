import { createAppSlice } from "@/lib/createAppSlice";
import { setNcavList, getNcavList } from "./strategyAPI";
import { Example8TableHeadType, Example8TableRowType } from "@/components/tableExample8";


export const STRATEGY_TABLE_HEAD: Example8TableHeadType[] = [
    {
        // head: "Digital Asset",
        head: "종목명",
        customeStyle: "!text-left",
    },
    {
        // head: "Price",
        head: "주가",
        customeStyle: "text-right",
    },
    {
        // head: "Change",
        head: "기대수익율",
        customeStyle: "text-right",
    },
    {
        // head: "Volume",
        head: "목표가",
        customeStyle: "text-right",
    },
    {
        // head: "Market Cap",
        head: "시가 총액",
        customeStyle: "text-right",
    },
    {
        head: "BPS",
        customeStyle: "text-right",
    },
    {
        head: "EPS",
        customeStyle: "text-right",
    },
    {
        head: "PBR",
        customeStyle: "text-right",
    },
    {
        head: "PER",
        customeStyle: "text-right",
    },
    // {
    //     head: "Trend",
    //     customeStyle: "text-right",
    // },
    // {
    //     head: "Actions",
    //     customeStyle: "text-right",
    // },
];

function translateJsonToTableRow(json: any) {
    const keys = Object.keys(json);
    const numList = Object.keys(json).length;
    const tableRows: Example8TableRowType[] = [];
    for (let i = 0; i < numList; i++) {
        const name = keys[i];
        const obj = json[name];
        const stockCode = obj[`stock_code`];
        const close = obj[`종가`];
        const targetPrice = (Number(obj[`유동자산`]) - Number(obj[`부채총계`])) / Number(obj[`상장주식수`]);
        const change = (((targetPrice / Number(close)) - 1) * 100)
        const color = (change > 100) ? `green` : (change > 50) ? `` : `red`;
        const marketCap = obj[`시가총액`];
        const bps = obj[`BPS`];
        const eps = obj[`EPS`];
        const pbr = obj[`PBR`];
        const per = obj[`PER`];
        const tableRow: Example8TableRowType = {
            digitalAsset: stockCode,
            detail: name,
            price: "₩" + close,
            change: change.toFixed(2).toString() + "%",
            volume: "₩" + targetPrice.toFixed(0).toString(),
            market: "₩" + marketCap,
            color: color,
            // trend?: number; // optional
            // chartName?: string;
            // chartData?: number[];
            bps: bps,
            eps: eps,
            pbr: pbr,
            per: per,
        };
        tableRows.push(tableRow);
    }

    return tableRows;
}

interface StrategyInfo {
    state: "init" | "loading" | "loaded" | "get-rejected" | "set-rejected" | "retry";
    value: any;
    STRATEGY_TABLE_ROW: Example8TableRowType[];
    strategyList: any;

}
const initialState: StrategyInfo = {
    state: "init",
    value: {},
    STRATEGY_TABLE_ROW: [],
    strategyList: [],
}

export const strategySlice = createAppSlice({
    name: "strategy",
    initialState,
    reducers: (create) => ({
        setLoading: create.reducer((state) => {
            // console.log(`[setLoading]`)
            state.state = "loading";
        }),
        setRetry: create.reducer((state) => {
            // console.log(`[setRetry]`)
            state.state = "retry";
        }),
        getStrategyList: create.asyncThunk(
            async ({ financialInfoDate, marketInfoDate }: { financialInfoDate: string, marketInfoDate: string }) => {
                // console.log(`[getStrategyList]`, financialInfoDate, marketInfoDate);
                const res: any = await getNcavList(financialInfoDate, marketInfoDate);
                return res;
            },
            {
                pending: (state) => {
                    // console.log(`[getStrategyList] pending`);
                    state.state = "loading";
                },
                fulfilled: (state, action) => {
                    const nextState = "loaded";
                    // console.log(`[getStrategyList]`, nextState, action.payload);
                    state.state = nextState;
                    const json = action.payload;

                    state.value = json;
                    const tableRow = translateJsonToTableRow(json);
                    state.STRATEGY_TABLE_ROW = tableRow
                    state.strategyList.push(tableRow);
                },
                rejected: (state) => {
                    const nextState = "get-rejected";
                    // console.log(`[getStrategyList]`, nextState);
                    state.state = nextState;
                }
            },
        ),
        setStrategyList: create.asyncThunk(
            async ({ financialInfoDate, marketInfoDate, ncavList }: { financialInfoDate: string, marketInfoDate: string, ncavList: string }) => {
                // console.log(`[setStrategyList]`, financialInfoDate, marketInfoDate, ncavList);
                const res: any = await setNcavList(financialInfoDate, marketInfoDate, ncavList);
                return res;
            },
            {
                pending: (state) => {
                    const nextState = "loading";
                    // console.log(`[setStrategyList]`, nextState);
                    state.state = "loading";
                },
                fulfilled: (state, action) => {
                    const nextState = "loaded";
                    // console.log(`[setStrategyList]`, nextState);
                    state.state = nextState;

                    const json = JSON.parse(action.payload);
                    const tableRow = translateJsonToTableRow(json);
                    state.STRATEGY_TABLE_ROW = tableRow
                    state.value = json;
                    state.strategyList.push(tableRow);
                },
                rejected: (state) => {
                    const nextState = "set-rejected";
                    // console.log(`[setStrategyList]`, nextState);
                    state.state = nextState;
                }
            },
        )
    }),
    selectors: {
        selectNcavList: (state) => state.value,
        selectStrategyState: (state) => state.state,
        selectStrategyTableRow: (state) => state.STRATEGY_TABLE_ROW,

        selectStrategyList: (state) => state.strategyList,
    }
});

export const { getStrategyList, setStrategyList, setLoading, setRetry } = strategySlice.actions;
export const { selectNcavList, selectStrategyState, selectStrategyTableRow, selectStrategyList } = strategySlice.selectors;