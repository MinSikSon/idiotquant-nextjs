import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getCapitalToken, getPurchaseLog } from "./algorithmTradeAPI";
import { registerCookie } from "@/components/util";


interface AlgorithmTradeType {
    state: "init"
    | "pending" | "fulfilled" | "rejected"
    ;
    capital_token: any;
    purchase_log: any;
}
const initialState: AlgorithmTradeType = {
    state: "init",
    capital_token: {},
    purchase_log: {},
}
export const algorithmTradeSlice = createAppSlice({
    name: "algorithmTrade",
    initialState,
    reducers: (create) => ({
        reqGetCapitalToken: create.asyncThunk(
            async () => {
                return await getCapitalToken();
            },
            {
                pending: (state) => {
                    console.log(`[reqGetCapitalToken] pending`);
                    state.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqGetCapitalToken] fulfilled`, `action.payload`, action.payload);
                    const json = JSON.parse(action.payload);
                    state.capital_token = json;
                    state.state = "fulfilled";
                },
                rejected: (state) => {
                    // console.log(`[reqGetCapitalToken] rejected`);
                    state.state = "rejected";
                },
            }
        ),
        reqGetPurchaseLog: create.asyncThunk(
            async () => {
                return await getPurchaseLog();
            },
            {
                pending: (state) => {
                    // console.log(`[reqGetPurchaseLog] pending`);
                    state.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqGetPurchaseLog] fulfilled`, `action.payload`, action.payload);
                    const json = action.payload;
                    state.purchase_log = json;
                    state.state = "fulfilled";
                },
                rejected: (state) => {
                    console.log(`[reqGetPurchaseLog]rejected`);
                    state.state = "rejected";
                },
            }
        ),
        // reqPostOrderCash: create.asyncThunk(
        //     async ({ koreaInvestmentToken, PDNO, buyOrSell }: { koreaInvestmentToken: KoreaInvestmentToken, PDNO: string, buyOrSell: string }) => {
        //         return await postOrderCash(koreaInvestmentToken, PDNO, buyOrSell);
        //     },
        //     {
        //         pending: (state) => {
        //             // console.log(`[reqPostOrderCash] pending`);
        //             state.koreaInvestmentOrderCash.state = "pending";
        //         },
        //         fulfilled: (state, action) => {
        //             // console.log(`[reqPostOrderCash] fulfilled`,`action.payload`, typeof action.payload, action.payload);
        //             if (undefined != action.payload["output1"]) {
        //                 const newKoreaInvestmentOrderCash: KoreaInvestmentOrderCash = action.payload;
        //                 state.koreaInvestmentOrderCash = { ...newKoreaInvestmentOrderCash, state: "fulfilled" };
        //                 state.state = "order-cash";
        //             }
        //         },
        //         rejected: (state) => {
        //             console.log(`[reqPostOrderCash] get-rejected 2`);
        //         },
        //     }
        // ),
    }),
    selectors: {
        selectAlgorithmTraceState: (state) => state.state,
        selectCapitalToken: (state) => state.capital_token,
        selectPurchageLog: (state) => state.purchase_log,
        // getKoreaInvestmentToken: (state) => state.koreaInvestmentToken,
        // getKoreaInvestmentBalance: (state) => state.koreaInvestmentBalance,
        // getKoreaInvestmentInquirePrice: (state) => state.koreaInvestmentInquirePrice,
        // getKoreaInvestmentInquireDailyItemChartPrice: (state) => state.koreaInvestmentInquireDailyItemChartPrice,
        // getKoreaInvestmentBalanceSheet: (state) => state.koreaInvestmentBalanceSheet,
    }
});

export const { reqGetCapitalToken, reqGetPurchaseLog } = algorithmTradeSlice.actions;
export const { selectAlgorithmTraceState, selectCapitalToken, selectPurchageLog } = algorithmTradeSlice.selectors;

// export const { reqPostApprovalKey, reqPostToken, reqGetInquireBalance, reqPostOrderCash, reqGetInquirePrice, reqGetInquireDailyItemChartPrice } = koreaInvestmentSlice.actions;
// export const { getKoreaInvestmentApproval, getKoreaInvestmentToken, getKoreaInvestmentBalance, getKoreaInvestmentInquirePrice, getKoreaInvestmentInquireDailyItemChartPrice } = koreaInvestmentSlice.selectors;

// export const { reqGetBalanceSheet } = koreaInvestmentSlice.actions;
