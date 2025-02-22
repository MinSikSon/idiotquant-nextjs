import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { registerCookie } from "@/components/util";
import { getQuotationsPriceDetail, getQuotationsSearchInfo } from "./koreaInvestmentUsMarketAPI";
import { KoreaInvestmentToken } from "../koreaInvestment/koreaInvestmentSlice";

interface KoreaInvestmentUsMaretType {
    state: "init"
    | "pending" | "fulfilled" | "rejected"
    ;
    searchInfo: any;
    priceDetail: any;
}
const initialState: KoreaInvestmentUsMaretType = {
    state: "init",
    searchInfo: {},
    priceDetail: {}
}
export const koreaInvestmentUsMarketSlice = createAppSlice({
    name: "koreaInvestmentUsMarket",
    initialState,
    reducers: (create) => ({
        reqGetQuotationsSearchInfo: create.asyncThunk(
            async ({ koreaInvestmentToken, PDNO }: { koreaInvestmentToken: KoreaInvestmentToken, PDNO: string }) => {
                return await getQuotationsSearchInfo(koreaInvestmentToken, PDNO);
            },
            {
                pending: (state) => {
                    console.log(`[reqGetQuotationsSearchInfo] pending`);
                    state.state = "pending";
                    // state.koreaInvestmentApproval.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqGetQuotationsSearchInfo] fulfilled`, `action.payload`, action.payload);
                    const json = action.payload;
                    state.searchInfo = json;
                    state.state = "fulfilled";
                },
                rejected: (state) => {
                    console.log(`[reqGetQuotationsSearchInfo] rejected`);
                    state.state = "rejected";
                },
            }
        ),
        reqGetQuotationsPriceDetail: create.asyncThunk(
            async ({ koreaInvestmentToken, PDNO }: { koreaInvestmentToken: KoreaInvestmentToken, PDNO: string }) => {
                return await getQuotationsPriceDetail(koreaInvestmentToken, PDNO);
            },
            {
                pending: (state) => {
                    console.log(`[reqGetQuotationsPriceDetail] pending`);
                    state.state = "pending";
                    // state.koreaInvestmentApproval.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqGetQuotationsPriceDetail] fulfilled`, `action.payload`, action.payload);
                    const json = action.payload;
                    state.priceDetail = json;
                    state.state = "fulfilled";
                },
                rejected: (state) => {
                    console.log(`[reqGetQuotationsPriceDetail] rejected`);
                    state.state = "rejected";
                },
            }
        ),
    }),

    selectors: {
        // getKoreaInvestmentBalanceSheet: (state) => state.koreaInvestmentBalanceSheet,
        getKoreaInvestmentUsMaretSearchInfo: (state) => state.searchInfo,
        getKoreaInvestmentUsMaretPriceDetail: (state) => state.priceDetail,
    }
});


export const { reqGetQuotationsSearchInfo, reqGetQuotationsPriceDetail } = koreaInvestmentUsMarketSlice.actions;
export const { getKoreaInvestmentUsMaretSearchInfo, getKoreaInvestmentUsMaretPriceDetail } = koreaInvestmentUsMarketSlice.selectors;
// export const { reqPostApprovalKey, reqPostToken, reqGetInquireBalance, reqPostOrderCash, reqGetInquirePrice, reqGetInquireDailyItemChartPrice } = koreaInvestmentSlice.actions;
// export const { setKoreaInvestmentToken } = koreaInvestmentSlice.actions;
// export const { getKoreaInvestmentApproval, getKoreaInvestmentToken, getKoreaInvestmentBalance, getKoreaInvestmentInquirePrice, getKoreaInvestmentInquireDailyItemChartPrice } = koreaInvestmentSlice.selectors;

// export const { reqGetBalanceSheet } = koreaInvestmentSlice.actions;
// export const { getKoreaInvestmentBalanceSheet } = koreaInvestmentSlice.selectors;
