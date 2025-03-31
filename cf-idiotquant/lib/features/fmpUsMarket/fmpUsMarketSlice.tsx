import { createAppSlice } from "@/lib/createAppSlice";
import { getFmpBalanceSheetStatement } from "./fmpUsMarketAPI";


export interface FmpBalanceSheetStatementType {
    // "acceptedDate": string;
    // "accountPayables": string;
    // "accumulatedOtherComprehensiveIncomeLoss": string;
    // "calendarYear": string;
    // "capitalLeaseObligations": string;
    // "cashAndCashEquivalents": string;
    // "cashAndShortTermInvestments": string;
    // "cik": string;
    // "commonStock": string;
    // "date": string;
    // "deferredRevenue": string;
    // "deferredRevenueNonCurrent": string;
    // "deferredTaxLiabilitiesNonCurrent": string;
    // "fillingDate": string;
    // "finalLink": string;
    // "goodwill": string;
    // "goodwillAndIntangibleAssets": string;
    // "intangibleAssets": string;
    // "inventory": string;
    // "link": string;
    // "longTermDebt": string;
    // "longTermInvestments": string;
    // "minorityInterest": string;
    // "netDebt": string;
    // "netReceivables": string;
    // "otherAssets": string;
    // "otherCurrentAssets": string;
    // "otherCurrentLiabilities": string;
    // "otherLiabilities": string;
    // "otherNonCurrentAssets": string;
    // "otherNonCurrentLiabilities": string;
    // "othertotalStockholdersEquity": string;
    // "period": string;
    // "preferredStock": string;
    // "propertyPlantEquipmentNet": string;
    // "reportedCurrency": string;
    // "retainedEarnings": string;
    // "shortTermDebt": string;
    // "shortTermInvestments": string;
    // "symbol": string;
    // "taxAssets": string;
    // "taxPayables": string;
    // "totalAssets": string;
    // "totalCurrentAssets": string;
    // "totalCurrentLiabilities": string;
    // "totalDebt": string;
    // "totalEquity": string;
    // "totalInvestments": string;
    // "totalLiabilities": string;
    // "totalLiabilitiesAndStockholdersEquity": string;
    // "totalLiabilitiesAndTotalEquity": string;
    // "totalNonCurrentAssets": string;
    // "totalNonCurrentLiabilities": string;
    // "totalStockholdersEquity": string;
    "symbol": string;
    "reportedCurrency": string;
    "cik": string;
    "fillingDate": string;
    "acceptedDate": string;
    "calendarYear": string;
    "period": string;
    "cashAndCashEquivalents": string;
    "shortTermInvestments": string;
    "cashAndShortTermInvestments": string;
    "netReceivables": string;
    "inventory": string;
    "otherCurrentAssets": string;
    "totalCurrentAssets": string;
    "propertyPlantEquipmentNet": string;
    "goodwill": string;
    "intangibleAssets": string;
    "goodwillAndIntangibleAssets": string;
    "longTermInvestments": string;
    "taxAssets": string;
    "otherNonCurrentAssets": string;
    "totalNonCurrentAssets": string;
    "otherAssets": string;
    "totalAssets": string;
    "accountPayables": string;
    "shortTermDebt": string;
    "taxPayables": string;
    "deferredRevenue": string;
    "otherCurrentLiabilities": string;
    "totalCurrentLiabilities": string;
    "longTermDebt": string;
    "deferredRevenueNonCurrent": string;
    "deferredTaxLiabilitiesNonCurrent": string;
    "otherNonCurrentLiabilities": string;
    "totalNonCurrentLiabilities": string;
    "otherLiabilities": string;
    "capitalLeaseObligations": string;
    "totalLiabilities": string;
    "preferredStock": string;
    "commonStock": string;
    "retainedEarnings": string;
    "accumulatedOtherComprehensiveIncomeLoss": string;
    "othertotalStockholdersEquity": string;
    "totalStockholdersEquity": string;
    "totalEquity": string;
    "totalLiabilitiesAndStockholdersEquity": string;
    "minorityInterest": string;
    "totalLiabilitiesAndTotalEquity": string;
    "totalInvestments": string;
    "totalDebt": string;
    "netDebt": string;
    "link": string;
    "finalLink": string;
}

interface FmpUsMaretType {
    state: "init"
    | "pending" | "fulfilled" | "rejected"
    | "order-cash"
    ;
    fmpBalanceSheetStatement: FmpBalanceSheetStatementType[];
}

const initialState: FmpUsMaretType = {
    state: "init",
    fmpBalanceSheetStatement: [],
}
export const fmpUsMarketSlice = createAppSlice({
    name: "fmpUsMarketSlice",
    initialState,
    reducers: (create) => ({
        reqGetFmpBalanceSheetStatement: create.asyncThunk(
            async (PDNO: string) => {
                return await getFmpBalanceSheetStatement(PDNO);
            },
            {
                pending: (state) => {
                    console.log(`[reqGetFmpBalanceSheetStatement] pending`);
                    state.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqGetFmpBalanceSheetStatement] fulfilled`, `action.payload`, typeof action.payload, action.payload);
                    // if (undefined != action.payload["output1"]) 
                    {
                        state.fmpBalanceSheetStatement = { ...state.fmpBalanceSheetStatement, ...action.payload };
                        state.state = "fulfilled";
                    }
                },
                rejected: (state) => {
                    console.log(`[reqGetFmpBalanceSheetStatement] rejected`);
                    state.state = "rejected";
                },
            }
        ),
    }),

    selectors: {
        selectFmpState: (state) => state.state,
        selectFmpBalanceSheetStatement: (state) => state.fmpBalanceSheetStatement,
    }
});

export const { reqGetFmpBalanceSheetStatement } = fmpUsMarketSlice.actions;
export const { selectFmpState, selectFmpBalanceSheetStatement } = fmpUsMarketSlice.selectors;