import { createAppSlice } from "@/lib/createAppSlice";
import { setNcavList, getNcavList } from "./strategyAPI";
import { Example8TableHeadType, Example8TableRowType } from "@/components/tableExample8";
import { PayloadAction } from "@reduxjs/toolkit";
import { getRandomMainImage, getRandomUserImage } from "@/app/(strategy)/strategy/image";


export const STRATEGY_TABLE_HEAD: Example8TableHeadType[] = [
    {
        // head: "Digital Asset",
        head: "종목명",
        customeStyle: "text-left",
    },
    {
        // head: "Price",
        head: "주가",
        customeStyle: "text-right",
    },
    {
        // head: "expectedRateOfReturn",
        head: "기대수익율",
        customeStyle: "text-right",
    },
    {
        // head: "targetPrice",
        head: "목표가",
        customeStyle: "text-right",
    },
    {
        // head: "Market Cap",
        head: "시가 총액",
        customeStyle: "text-right",
    },
    {
        head: "순유동자산",
        customeStyle: "text-right",
    },
    {
        head: "당기순이익",
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
    const numList = keys.length;
    const tableRows: Example8TableRowType[] = [];
    for (let i = 0; i < numList; i++) {
        const name = keys[i];
        const obj = json[name];
        const stockCode = obj[`stock_code`];
        const close = obj[`종가`];
        const netCurrentAssert = (Number(obj[`유동자산`]) - Number(obj[`부채총계`]));
        const targetPrice = netCurrentAssert / Number(obj[`상장주식수`]);
        const expectedRateOfReturn = (((targetPrice / Number(close)) - 1) * 100)
        let expectedRateOfReturnColor = ``;
        if (expectedRateOfReturn >= 50) {
            expectedRateOfReturnColor = `green`;
        }
        else if (expectedRateOfReturn < 0) {
            expectedRateOfReturnColor = `red`;
        }
        const marketCap = obj[`시가총액`];
        const bps = obj[`BPS`];
        const eps = obj[`EPS`];
        const pbr = obj[`PBR`];
        const per = obj[`PER`];
        const netIncome = obj[`당기순이익`];
        const tableRow: Example8TableRowType = {
            digitalAsset: stockCode,
            detail: name,
            closePrice: close,
            expectedRateOfReturn: expectedRateOfReturn.toFixed(1).toString() + "%",
            expectedRateOfReturnColor: expectedRateOfReturnColor,
            targetPrice: targetPrice.toFixed(0).toString(),
            market: marketCap,
            netCurrentAssert: String(netCurrentAssert),
            netIncome: netIncome,
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

export interface StrategyInfo {
    title: string;
    subTitle: string;
    desc: string;
    img: string;
    profileImg: string;
    value: any;
    financial_date: string;
    market_date: string;
    STRATEGY_TABLE_ROW: Example8TableRowType[];
    stockList: any;
}
interface StrategyInfoList {
    state: "init" | "loading" | "loaded" | "get-rejected" | "set-rejected" | "retry";
    strategyCount: number;
    strategyInfoList: StrategyInfo[];

}
const initialState: StrategyInfoList = {
    state: "init",
    strategyCount: 0,
    strategyInfoList: []
}

export const strategySlice = createAppSlice({
    name: "strategy",
    initialState,
    reducers: (create) => ({
        setLoading: create.reducer((state) => {
            state.state = "loading";
        }),
        setRetry: create.reducer((state) => {
            state.state = "retry";
        }),
        getStrategyList: create.asyncThunk(
            async ({ financialInfoDate, marketInfoDate }: { financialInfoDate: string, marketInfoDate: string }) => {
                const res: any = await getNcavList(financialInfoDate, marketInfoDate);
                return res;
            },
            {
                pending: (state) => {
                    state.state = "loading";
                },
                fulfilled: (state, action) => {
                    const nextState = "loaded";
                    state.state = nextState;
                    const json = action.payload;

                    const infoIndex = state.strategyCount;
                    state.strategyInfoList[infoIndex].value = json;

                    const tableRow = translateJsonToTableRow(json);
                    state.strategyInfoList[infoIndex].STRATEGY_TABLE_ROW = tableRow
                    state.strategyInfoList[infoIndex].stockList = tableRow;

                    state.strategyCount = state.strategyCount + 1;
                },
                rejected: (state) => {
                    const nextState = "get-rejected";
                    state.state = nextState;
                }
            },
        ),
        addStrategyList: create.asyncThunk(
            async ({ title, subTitle, desc, financialInfoDate, marketInfoDate, ncavList }: { title: string, subTitle: string, desc: string, financialInfoDate: string, marketInfoDate: string, ncavList: string }) => {
                const res: any = await setNcavList(financialInfoDate, marketInfoDate, ncavList);
                return { 'title': title, 'subTitle': subTitle, 'desc': desc, 'res': res, 'financial_date': financialInfoDate, 'market_date': marketInfoDate };
            },
            {
                pending: (state) => {
                    const nextState = "loading";
                    state.state = "loading";
                },
                fulfilled: (state, action) => {
                    const nextState = "loaded";
                    state.state = nextState;

                    const json = JSON.parse(action.payload['res']);

                    const title = action.payload['title'];
                    const subTitle = action.payload['subTitle'];
                    const desc = action.payload['desc'];
                    const financial_date = action.payload['financial_date'];
                    const market_date = action.payload['market_date'];

                    const newStrategyInfo: StrategyInfo = {
                        title: title,
                        subTitle: subTitle,
                        desc: desc,
                        img: getRandomMainImage(),
                        profileImg: getRandomUserImage(),
                        value: json,
                        financial_date: financial_date,
                        market_date: market_date,
                        STRATEGY_TABLE_ROW: translateJsonToTableRow(json),
                        stockList: translateJsonToTableRow(json)
                    };
                    console.log(`newStrategyInfo`, newStrategyInfo);
                    state.strategyInfoList.push(newStrategyInfo);
                    state.strategyCount = state.strategyCount + 1;
                },
                rejected: (state) => {
                    const nextState = "set-rejected";
                    state.state = nextState;
                }
            },
        )
    }),
    selectors: {
        getStrategyInfoList: (state) => state.strategyInfoList,
        selectNcavList: (state) => state.strategyInfoList[0].value,
        selectStrategyState: (state) => state.state,
        selectStrategyTableRow: (state) => state.strategyInfoList[0].STRATEGY_TABLE_ROW,

        selectStockList: (state) => state.strategyInfoList[0].stockList,
    }
});

export const { getStrategyList, addStrategyList, setLoading, setRetry } = strategySlice.actions;

export const { selectNcavList, selectStrategyState, selectStrategyTableRow, selectStockList } = strategySlice.selectors;
export const { getStrategyInfoList } = strategySlice.selectors;
