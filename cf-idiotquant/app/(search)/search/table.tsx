import React from "react";

// FinnhubBalanceSheetTable.tsx
// Finnhub `FinancialsAsReported` 형태의 데이터를 받아서 BS(대차대조표)만 표로 렌더링합니다.
// 사용 예:
// <FinnhubBalanceSheetTable data={financialsAsReported} />
// 기대되는 `data` 형태 (간단화):
// [
//   {
//     acceptedDate: '2025-02-04 20:41:40',
//     startDate: '2024-01-01 00:00:00',
//     endDate: '2024-12-31 00:00:00',
//     report: { bs: [ { label, concept, value, unit }, ... ], ic: [...], cf: [...] }
//   },
//   ...
// ]

const DEBUG = false;

type FinnhubReport = {
    acceptedDate?: string;
    filedDate?: string;
    startDate?: string;
    endDate?: string;
    year?: number;
    report?: {
        bs?: Array<Record<string, any>>;
        ic?: Array<Record<string, any>>;
        cf?: Array<Record<string, any>>;
    };
};

interface Props {
    data: FinnhubReport[];
    className?: string;
    // optional formatter
    formatNumber?: (v: number | null | undefined) => string;
}
const DEFAULT_CONCEPTS_BS: { label: string; concept: string[] }[] = [
    { label: "현금및현금성자산", concept: ["us-gaap_CashAndCashEquivalentsAtCarryingValue", "CashAndCashEquivalentsAtCarryingValue"] },
    { label: "제한현금", concept: ["us-gaap_RestrictedCashAndCashEquivalentsAtCarryingValue", "RestrictedCashAndCashEquivalentsAtCarryingValue"] },
    { label: "매출채권", concept: ["us-gaap_AccountsReceivableNetCurrent", "AccountsReceivableNetCurrent"] },
    { label: "단기대출금/어음수취채권", concept: ["us-gaap_NotesAndLoansReceivableNetCurrent", "NotesAndLoansReceivableNetCurrent"] },
    { label: "재고자산", concept: ["us-gaap_InventoryNet", "InventoryNet"] },
    { label: "선급세금", concept: ["us-gaap_PrepaidTaxes", "PrepaidTaxes"] },
    { label: "선급비용및기타유동자산", concept: ["us-gaap_PrepaidExpenseAndOtherAssetsCurrent", "PrepaidExpenseAndOtherAssetsCurrent"] },
    { label: "유동자산합계", concept: ["us-gaap_AssetsCurrent", "AssetsCurrent"] },
    { label: "유형자산", concept: ["us-gaap_PropertyPlantAndEquipmentNet", "PropertyPlantAndEquipmentNet"] },
    { label: "무형자산", concept: ["us-gaap_FiniteLivedIntangibleAssetsNet", "FiniteLivedIntangibleAssetsNet"] },
    { label: "영구권리자산", concept: ["us-gaap_IndefiniteLivedContractualRights", "IndefiniteLivedContractualRights"] },
    { label: "사용권자산", concept: ["us-gaap_OperatingLeaseRightOfUseAsset", "OperatingLeaseRightOfUseAsset"] },
    { label: "기타비유동자산", concept: ["us-gaap_OtherAssetsNoncurrent", "OtherAssetsNoncurrent"] },
    { label: "자산총계", concept: ["us-gaap_Assets", "Assets"] },
    { label: "매입채무", concept: ["us-gaap_AccountsPayableCurrent", "AccountsPayableCurrent"] },
    { label: "유동부채합계", concept: ["us-gaap_LiabilitiesCurrent", "LiabilitiesCurrent"] },
    { label: "비유동부채합계", concept: ["us-gaap_ConvertibleLongTermNotesPayable", "ConvertibleLongTermNotesPayable"] },
    { label: "부채총계", concept: ["us-gaap_Liabilities", "Liabilities"] },
    { label: "자본금", concept: ["us-gaap_CommonStockValue", "CommonStockValue"] },
    { label: "자본잉여금", concept: ["us-gaap_AdditionalPaidInCapital", "AdditionalPaidInCapital"] },
    { label: "기타포괄손익누계", concept: ["us-gaap_AccumulatedOtherComprehensiveIncomeLossNetOfTax", "AccumulatedOtherComprehensiveIncomeLossNetOfTax"] },
    { label: "이익잉여금", concept: ["us-gaap_RetainedEarningsAccumulatedDeficit", "RetainedEarningsAccumulatedDeficit"] },
    { label: "자본총계", concept: ["us-gaap_StockholdersEquity", "StockholdersEquity"] },
];

const DEFAULT_CONCEPTS_IC: { label: string; concept: string[] }[] = [
    { label: "매출액", concept: ["us-gaap_RevenueFromContractWithCustomerExcludingAssessedTax", "RevenueFromContractWithCustomerExcludingAssessedTax"] },
    { label: "매출원가", concept: ["us-gaap_CostOfGoodsAndServicesSold", "CostOfGoodsAndServicesSold"] },
    { label: "매출총이익", concept: ["us-gaap_GrossProfit", "GrossProfit"] },
    { label: "연구개발비", concept: ["us-gaap_ResearchAndDevelopmentExpense", "ResearchAndDevelopmentExpense"] },
    { label: "판매관리비", concept: ["us-gaap_SellingAndMarketingExpense", "SellingAndMarketingExpense"] },
    { label: "일반관리비", concept: ["us-gaap_GeneralAndAdministrativeExpense", "GeneralAndAdministrativeExpense"] },
    { label: "영업비용", concept: ["us-gaap_OperatingExpenses", "OperatingExpenses"] },
    { label: "영업손익", concept: ["us-gaap_OperatingIncomeLoss", "OperatingIncomeLoss"] },
    { label: "금융수익", concept: ["us-gaap_InvestmentIncomeInterest", "InvestmentIncomeInterest"] },
    { label: "금융비용", concept: ["us-gaap_InterestExpenseNonoperating", "InterestExpenseNonoperating"] },
    { label: "기타비영업손익", concept: ["us-gaap_OtherNonoperatingIncomeExpense", "OtherNonoperatingIncomeExpense"] },
    { label: "법인세비용", concept: ["us-gaap_IncomeTaxExpenseBenefit", "IncomeTaxExpenseBenefit"] },
    { label: "순손익", concept: ["us-gaap_NetIncomeLoss", "NetIncomeLoss"] },
    { label: "주당순이익(Basic)", concept: ["us-gaap_EarningsPerShareBasic", "EarningsPerShareBasic"] },
    { label: "주당순이익(Diluted)", concept: ["us-gaap_EarningsPerShareDiluted", "EarningsPerShareDiluted"] },
    { label: "주식수(Basic)", concept: ["us-gaap_WeightedAverageNumberOfSharesOutstandingBasic", "WeightedAverageNumberOfSharesOutstandingBasic"] },
    { label: "주식수(Diluted)", concept: ["us-gaap_WeightedAverageNumberOfDilutedSharesOutstanding", "WeightedAverageNumberOfDilutedSharesOutstanding"] },
    { label: "기타포괄손익환산", concept: ["us-gaap_OtherComprehensiveIncomeForeignCurrencyTransactionAndTranslationGainLossArisingDuringPeriodNetOfTax", "OtherComprehensiveIncomeForeignCurrencyTransactionAndTranslationGainLossArisingDuringPeriodNetOfTax"] },
    { label: "총포괄손익", concept: ["us-gaap_ComprehensiveIncomeNetOfTax", "ComprehensiveIncomeNetOfTax"] },
];

const DEFAULT_CONCEPTS_CF: { label: string; concept: string[] }[] = [
    { label: "순손익", concept: ["us-gaap_NetIncomeLoss", "NetIncomeLoss"] },
    { label: "감가상각비", concept: ["us-gaap_DepreciationAndAmortization", "DepreciationAndAmortization"] },
    { label: "주식보상비", concept: ["us-gaap_ShareBasedCompensation", "ShareBasedCompensation"] },
    { label: "채무상각손실", concept: ["us-gaap_GainsLossesOnExtinguishmentOfDebt", "GainsLossesOnExtinguishmentOfDebt"] },
    { label: "운전자본변동-매출채권", concept: ["us-gaap_IncreaseDecreaseInAccountsReceivable", "IncreaseDecreaseInAccountsReceivable"] },
    { label: "운전자본변동-재고자산", concept: ["us-gaap_IncreaseDecreaseInInventories", "IncreaseDecreaseInInventories"] },
    { label: "운전자본변동-선급비용등", concept: ["us-gaap_IncreaseDecreaseInOtherCurrentAssets", "IncreaseDecreaseInOtherCurrentAssets"] },
    { label: "운전자본변동-매입채무", concept: ["us-gaap_IncreaseDecreaseInAccountsPayable", "IncreaseDecreaseInAccountsPayable"] },
    { label: "영업활동현금흐름", concept: ["us-gaap_NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivities"] },
    { label: "투자활동현금흐름", concept: ["us-gaap_NetCashProvidedByUsedInInvestingActivities", "NetCashProvidedByUsedInInvestingActivities"] },
    { label: "유형자산취득지출", concept: ["us-gaap_PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquirePropertyPlantAndEquipment"] },
    { label: "무형자산취득지출", concept: ["us-gaap_PaymentsToAcquireIntangibleAssets", "PaymentsToAcquireIntangibleAssets"] },
    { label: "투자활동현금유입", concept: ["us-gaap_ProceedsFromSaleOfPropertyPlantAndEquipment", "ProceedsFromSaleOfPropertyPlantAndEquipment"] },
    { label: "재무활동현금흐름", concept: ["us-gaap_NetCashProvidedByUsedInFinancingActivities", "NetCashProvidedByUsedInFinancingActivities"] },
    { label: "주식발행현금유입", concept: ["us-gaap_ProceedsFromIssuanceOfCommonStock", "ProceedsFromIssuanceOfCommonStock"] },
    { label: "부채상환현금유출", concept: ["us-gaap_RepaymentsOfBankDebt", "RepaymentsOfBankDebt"] },
    { label: "차입현금유입", concept: ["us-gaap_ProceedsFromLinesOfCredit", "ProceedsFromLinesOfCredit"] },
    { label: "이자현금지급", concept: ["us-gaap_InterestPaidNet", "InterestPaidNet"] },
    { label: "법인세현금지급", concept: ["us-gaap_IncomeTaxesPaidNet", "IncomeTaxesPaidNet"] },
    { label: "환율영향", concept: ["us-gaap_EffectOfExchangeRateOnCashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsIncludingDisposalGroupAndDiscontinuedOperations", "EffectOfExchangeRateOnCashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsIncludingDisposalGroupAndDiscontinuedOperations"] },
    { label: "현금및현금성자산증감", concept: ["us-gaap_CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsPeriodIncreaseDecreaseIncludingExchangeRateEffect", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsPeriodIncreaseDecreaseIncludingExchangeRateEffect"] },
];

// 기본 보여줄 항목들 — Finnhub의 `concept` 값을 기준으로 매핑
const DEFAULT_CONCEPTS: { label: string; concept: string[] }[] = [
    // { label: "현금및현금성자산", concept: ["us-gaap_CashAndCashEquivalentsAtCarryingValue", "CashAndCashEquivalentsAtCarryingValue"] },
    // { label: "단기금융자산", concept: ["us-gaap_ShortTermInvestments", "ShortTermInvestments"] },
    // { label: "매출채권", concept: ["us-gaap_AccountsReceivableNetCurrent", "AccountsReceivableNetCurrent"] },
    // { label: "재고자산", concept: ["us-gaap_InventoriesNet", "InventoriesNet"] },
    // { label: "유동자산합계", concept: ["us-gaap_AssetsCurrent", "AssetsCurrent"] },
    // { label: "비유동자산합계", concept: ["us-gaap_NoncurrentAssets", "NoncurrentAssets"] },
    // { label: "자산총계", concept: ["us-gaap_Assets", "Assets"] },
    // { label: "매입채무", concept: ["us-gaap_AccountsPayableCurrent", "AccountsPayableCurrent"] },
    // { label: "유동부채합계", concept: ["us-gaap_LiabilitiesCurrent", "LiabilitiesCurrent"] },
    // { label: "비유동부채합계", concept: ["us-gaap_NoncurrentLiabilities", "NoncurrentLiabilities"] },
    // { label: "부채총계", concept: ["us-gaap_Liabilities", "Liabilities"] },
    // { label: "자본금(주식자본)", concept: ["us-gaap_CommonStockValue", "CommonStockValue"] },
    // { label: "자본잉여금", concept: ["us-gaap_AdditionalPaidInCapital", "AdditionalPaidInCapital"] },
    // { label: "이익잉여금", concept: ["us-gaap_RetainedEarningsAccumulatedDeficit", "RetainedEarningsAccumulatedDeficit"] },
    // { label: "자본총계", concept: ["us-gaap_StockholdersEquity", "StockholdersEquity"] },
    ...DEFAULT_CONCEPTS_BS,
    ...DEFAULT_CONCEPTS_IC,
    ...DEFAULT_CONCEPTS_CF,
];


function defaultFormatNumber(v: number | null | undefined) {
    if (v === null || v === undefined || Number.isNaN(v)) return "-";
    return Math.round(v).toLocaleString();
}

export default function FinnhubBalanceSheetTable({ data = [], className = "", formatNumber }: Props) {
    const fmt = formatNumber || defaultFormatNumber;

    // 안전성: data 역순(최근 항목 먼저) 또는 그대로 사용
    const reports = Array.isArray(data) ? data : [];
    if (DEBUG) console.log(`[FinnhubBalanceSheetTable]`, `reports.length`, reports.length, reports);

    // 각 report에서 bs 배열을 사용하여 concept -> value 매핑을 만들자
    const columns = reports.map((r) => {
        const endDate = r.endDate || r.filedDate || r.acceptedDate || "";
        // bs 배열은 { label, concept, value, unit } 형태로 오는 게 일반적
        const bsArr = r.report?.bs || [];
        const map = new Map<string, number | null>();
        bsArr.forEach((item: any) => {
            const concept: string = item?.concept || item?.label || "";
            // value 필드가 string일 수 있음 -> 숫자로 변환
            const raw = item?.value ?? item?.val ?? item?.amount ?? null;
            const num = raw === null || raw === undefined ? null : Number(raw);
            map.set(concept, Number.isNaN(num) ? null : num);
        });

        const cfArr = r.report?.cf || [];
        cfArr.forEach((item: any) => {
            const concept: string = item?.concept || item?.label || "";
            // value 필드가 string일 수 있음 -> 숫자로 변환
            const raw = item?.value ?? item?.val ?? item?.amount ?? null;
            const num = raw === null || raw === undefined ? null : Number(raw);
            map.set(concept, Number.isNaN(num) ? null : num);
        });

        const icArr = r.report?.ic || [];
        icArr.forEach((item: any) => {
            const concept: string = item?.concept || item?.label || "";
            // value 필드가 string일 수 있음 -> 숫자로 변환
            const raw = item?.value ?? item?.val ?? item?.amount ?? null;
            const num = raw === null || raw === undefined ? null : Number(raw);
            map.set(concept, Number.isNaN(num) ? null : num);
        });

        return { key: endDate, label: formatColumnLabel(endDate, r), map };
    });

    if (DEBUG) console.log(`[FinnhubBalanceSheetTable]`, `columns`, columns);

    return (
        <div className={`overflow-x-auto ${className}`}>
            <table className="table-auto w-full text-right font-mono border border-gray-300">
                <thead className="bg-gray-100 dark:bg-black">
                    <tr>
                        <th className="border px-2 py-1 text-left">항목</th>
                        {columns.map((col, idx) => (
                            <th key={idx} className="border pr-1 py-1 text-center">
                                <div className="text-sm">{col.label}</div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {DEFAULT_CONCEPTS.map((row, rowIndex) => (
                        <tr key={rowIndex} className="odd:bg-white even:bg-gray-50 dark:odd:bg-black dark:even:bg-gray-700">
                            <td className="border pr-1 py-1 text-left">{row.label}</td>
                            {columns.map((col, colIndex) => {
                                const v = col.map.get(row.concept[0]) ?? col.map.get(row.concept[1]) ?? null;
                                return (
                                    <td key={colIndex} className="border pr-1 py-1">
                                        {v === null ? "-" : <span title={String(v)}>{fmt(v)}</span>}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function formatColumnLabel(endDate: string, r: FinnhubReport) {
    // endDate: "2024-12-31 00:00:00" 같은 형식일 수 있음
    if (!endDate) return r.acceptedDate || "-";
    const d = endDate.split(" ")[0];
    // return `종료: ${d}` 또는 `2024-12-31` 형식
    return d;
}
