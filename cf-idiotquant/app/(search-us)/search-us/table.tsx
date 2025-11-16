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

// 기본 보여줄 항목들 — Finnhub의 `concept` 값을 기준으로 매핑
const DEFAULT_CONCEPTS: { label: string; concept: string }[] = [
    { label: "현금및현금성자산", concept: "us-gaap_CashAndCashEquivalentsAtCarryingValue" },
    { label: "단기금융자산", concept: "us-gaap_ShortTermInvestments" },
    { label: "매출채권", concept: "us-gaap_AccountsReceivableNetCurrent" },
    { label: "재고자산", concept: "us-gaap_InventoriesNet" },
    { label: "유동자산합계", concept: "us-gaap_AssetsCurrent" },
    { label: "비유동자산합계", concept: "us-gaap_NoncurrentAssets" },
    { label: "자산총계", concept: "us-gaap_Assets" },
    { label: "매입채무", concept: "us-gaap_AccountsPayableCurrent" },
    { label: "유동부채합계", concept: "us-gaap_LiabilitiesCurrent" },
    { label: "비유동부채합계", concept: "us-gaap_NoncurrentLiabilities" },
    { label: "부채총계", concept: "us-gaap_Liabilities" },
    { label: "자본금(주식자본)", concept: "us-gaap_CommonStockValue" },
    { label: "자본잉여금", concept: "us-gaap_AdditionalPaidInCapital" },
    { label: "이익잉여금", concept: "us-gaap_RetainedEarningsAccumulatedDeficit" },
    { label: "자본총계", concept: "us-gaap_StockholdersEquity" },
];

function defaultFormatNumber(v: number | null | undefined) {
    if (v === null || v === undefined || Number.isNaN(v)) return "-";
    return Math.round(v).toLocaleString();
}

export default function FinnhubBalanceSheetTable({ data = [], className = "", formatNumber }: Props) {
    const fmt = formatNumber || defaultFormatNumber;

    // 안전성: data 역순(최근 항목 먼저) 또는 그대로 사용
    const reports = Array.isArray(data) ? data : [];

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

        return { key: endDate, label: formatColumnLabel(endDate, r), map };
    });

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
                                const v = col.map.get(row.concept) ?? null;
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
