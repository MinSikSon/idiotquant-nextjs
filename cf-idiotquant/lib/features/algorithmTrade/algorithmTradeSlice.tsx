import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getCapitalToken, getInquirePriceMulti, getPurchaseLog } from "./algorithmTradeAPI";
import { registerCookie } from "@/components/util";
import { KoreaInvestmentToken } from "../koreaInvestment/koreaInvestmentSlice";


interface CapitalTokenType {
    state: "init"
    | "pending" | "fulfilled" | "rejected"
    ;
    value: any;
}

interface AlgorithmTradeType {
    state: "init"
    | "pending" | "fulfilled" | "rejected"
    ;
    capital_token: CapitalTokenType;
    inquire_price_multi: any;
    purchase_log: any;
}
const initialState: AlgorithmTradeType = {
    state: "init",
    capital_token: {
        state: "init",
        value: {}
    },
    inquire_price_multi: {},
    purchase_log: {},
}
export const algorithmTradeSlice = createAppSlice({
    name: "algorithmTrade",
    initialState,
    reducers: (create) => ({
        reqGetInquirePriceMulti: create.asyncThunk(
            async ({ koreaInvestmentToken, PDNOs }: { koreaInvestmentToken: KoreaInvestmentToken, PDNOs: string[] }) => {
                return await getInquirePriceMulti(koreaInvestmentToken, PDNOs);
            },
            {
                pending: (state) => {
                    console.log(`[reqGetInquirePriceMulti] pending`);
                    state.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqGetInquirePriceMulti] fulfilled`, `action.payload`, typeof action.payload, action.payload);
                    // const json = JSON.parse(action.payload);
                    // console.log(`[reqGetInquirePriceMulti] fulfilled json`, json);
                    state.inquire_price_multi = { ...state.inquire_price_multi, ...action.payload };
                    // state.inquire_price_multi = json["stock_list"];
                    state.state = "fulfilled";
                },
                rejected: (state) => {
                    // console.log(`[reqGetInquirePriceMulti] rejected`);
                    state.state = "rejected";
                },
            }
        ),
        reqGetCapitalToken: create.asyncThunk(
            async ({ koreaInvestmentToken }: { koreaInvestmentToken: KoreaInvestmentToken }) => {
                return await getCapitalToken(koreaInvestmentToken);
            },
            {
                pending: (state) => {
                    // console.log(`[reqGetCapitalToken] pending`);
                    state.state = "pending";
                    state.capital_token.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqGetCapitalToken] fulfilled`, `action.payload`, typeof action.payload, action.payload);
                    const json = JSON.parse(action.payload);
                    // console.log(`[reqGetCapitalToken] fulfilled json`, json);
                    state.capital_token = { state: "fulfilled", value: json };
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
        selectInquirePriceMulti: (state) => state.inquire_price_multi,
        selectPurchageLog: (state) => state.purchase_log,
    }
});

export const { reqGetInquirePriceMulti, reqGetCapitalToken, reqGetPurchaseLog } = algorithmTradeSlice.actions;
export const { selectAlgorithmTraceState, selectCapitalToken, selectInquirePriceMulti, selectPurchageLog } = algorithmTradeSlice.selectors;
