import { createAppSlice } from "@/lib/createAppSlice";
import { setNcavList, getNcavList } from "./strategyAPI";
import { Example8TableHeadType, Example8TableRowType } from "@/components/tableExample8";
import { PayloadAction } from "@reduxjs/toolkit";
import { getRandomMainImage, getRandomUserImage } from "@/app/(strategy)/strategy/image";


export const STRATEGY_TABLE_HEAD: Example8TableHeadType[] = [
    {
        head: "종목명",
        desc: "🥭🍒",
        customeStyle: "text-left",
    },
    {
        head: "주가",
        desc: "market date 일자의 종가입니다.",
        customeStyle: "text-right",
    },
    {
        head: "기대수익율",
        desc: "기대수익율 = (유동자산 - 부채총계) / 시가총액",
        customeStyle: "text-right",
    },
    {
        head: "목표가",
        desc: "시가총액 대비 순유동자산 비율로 계산됩니다.",
        customeStyle: "text-right",
    },
    {
        head: "시가 총액",
        desc: "시가총액(Market Capitalization)은 주식시장에서 거래되는 기업의 전체 가치를 나타내는 지표로, 해당 기업의 주식 가격과 발행 주식 수를 곱한 값입니다. 이는 주식 시장에서 기업의 상대적인 크기나 가치를 평가하는 데 사용됩니다.",
        customeStyle: "text-right",
    },
    {
        head: "순유동자산",
        desc: "순유동자산(Net Working Capital, NWC)은 기업의 유동자산에서 유동부채를 차감한 값으로, 기업의 단기적인 재무건전성을 나타내는 지표입니다. 이 값이 클수록 기업은 단기적인 채무를 갚을 수 있는 능력이 높다는 의미입니다.",
        customeStyle: "text-right",
    },
    {
        head: "당기순이익",
        desc: "당기순이익(Net Income)은 기업이 일정 기간 동안 벌어들인 최종적인 이익을 의미합니다. 즉, 매출에서 모든 비용(원가, 운영비, 이자, 세금 등)을 차감한 후 실제 남는 돈입니다.",
        customeStyle: "text-right",
    },
    {
        head: "BPS",
        desc: "BPS는 기업의 주당 순자산 가치(Book Value Per Share) 를 의미하며, 주식 한 주당 순자산(자본)이 얼마나 되는지를 나타내는 지표입니다.",
        customeStyle: "text-right",
    },
    {
        head: "EPS",
        desc: "EPS는 주당순이익(Earnings Per Share,)을 의미하며, 기업이 한 해 동안 벌어들인 순이익을 주식 한 주당 얼마씩 배분할 수 있는지를 나타내는 지표입니다.",
        customeStyle: "text-right",
    },
    {
        head: "PBR",
        desc: "PBR(Price to Book Ratio, 주가순자산비율)는 기업의 주가를 주당순자산(BPS) 으로 나눈 비율로, 주식 시장에서 그 기업의 순자산 대비 주식이 얼마나 고평가되었는지 또는 저평가되었는지를 나타내는 지표입니다.",
        customeStyle: "text-right",
    },
    {
        head: "PER",
        desc: "PER(Price to Earnings Ratio, 주가수익비율)는 주가를 주당순이익(EPS) 으로 나눈 비율로, 기업의 주가가 그 기업의 이익에 비해 얼마나 고평가되거나 저평가되었는지를 나타내는 지표입니다. 이는 주식이 상대적으로 비싸거나 싼지를 평가하는 데 사용됩니다.",
        customeStyle: "text-right",
    },
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
        let expectedRateOfReturn = `유동자산 x`;
        let expectedRateOfReturnColor = ``;
        if (true == isNaN(targetPrice)) {
            expectedRateOfReturnColor = `text-red-500`;
        }
        else {
            let expectedRateOfReturnNumber = (((targetPrice / Number(close)) - 1) * 100);
            if (expectedRateOfReturnNumber >= 50) {
                expectedRateOfReturnColor = `text-green-500`;
            }
            else if (expectedRateOfReturnNumber < 0) {
                expectedRateOfReturnColor = `text-red-500`;
            }

            expectedRateOfReturn = expectedRateOfReturnNumber.toFixed(1).toString() + `%`;
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
            expectedRateOfReturn: expectedRateOfReturn,
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
    title: any;
    subTitle: any;
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
            async ({ title, subTitle, desc, financialInfoDate, marketInfoDate, ncavList }: { title: any, subTitle: any, desc: string, financialInfoDate: string, marketInfoDate: string, ncavList: string }) => {
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
                    // console.log(`newStrategyInfo`, newStrategyInfo);
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
