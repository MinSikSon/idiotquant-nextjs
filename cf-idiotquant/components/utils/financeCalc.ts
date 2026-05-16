export const ONE_HUNDRED_MILLION = 100000000;

export interface ValuationRow {
  multiplier: string;
  returnPct: number;
  targetPrice: number;
}

export interface ValuationResult {
  title: string;
  description: string;
  formula: string;
  headers: string[];
  rows: ValuationRow[];
  metrics: {
    label: string;
    value: string;
  }[];
  footerNotice: string;
}

/**
 * 한국 주식 NCAV 계산 로직 (구조화된 객체 반환)
 */
export function calculateKrNcav(kiBS: any, kiChart: any): ValuationResult {
    const ONE_HUNDRED_MILLION = 100000000;

    const cras = Number(kiBS?.output?.[0]?.cras ?? 0) * ONE_HUNDRED_MILLION;
    const lblt = Number(kiBS?.output?.[0]?.total_lblt ?? 0) * ONE_HUNDRED_MILLION;

    const lstn = Number(kiChart?.output1?.lstn_stcn ?? 1);
    const prpr = Number(kiChart?.output1?.stck_prpr ?? 0);

    const netCurrentAsset = cras - lblt;
    const target = netCurrentAsset / lstn;

    const rows = [1.0, 1.2, 1.5].map(r => {
        const adjustedTarget = target / r;
        const returnPct = (adjustedTarget / prpr - 1) * 100;

        return {
            multiplier: `${r.toFixed(1)}배`,
            returnPct: Number(returnPct.toFixed(2)),
            targetPrice: Math.round(adjustedTarget)
        };
    });

    return {
        title: "NCAV 가치 평가 모델",
        description: "벤자민 그레이엄의 청산가치 기반 계량 모델입니다.",
        formula: "NCAV (청산가치) = 유동자산 - 총부채",
        headers: ["가중치 (배수)", "기대 수익률", "적정 주가"],
        rows,
        metrics: [
            { label: "순유동자산 (NCAV)", value: `${(netCurrentAsset / ONE_HUNDRED_MILLION).toLocaleString()}억 원` },
            { label: "총부채 (Liabilities)", value: `${(lblt / ONE_HUNDRED_MILLION).toLocaleString()}억 원` },
            { label: "현재가 (Price)", value: `${prpr.toLocaleString()}원` }
        ],
        footerNotice: "NCAV 전략은 시가총액이 순유동자산의 2/3(약 0.67배) 이하일 때 강력한 매수 신호로 봅니다."
    };
}

/**
 * 한국 주식 S-RIM 계산 로직 (구조화된 객체 반환)
 */
export function calculateKrSRIM(kiBS: any, kiIS: any, kiChart: any, baseKe: number = 9.0): ValuationResult {
    const ONE_HUNDRED_MILLION = 100000000;
    const total_cptl = Number(kiBS?.output?.[0]?.total_cptl ?? 1) * ONE_HUNDRED_MILLION;
    const thtr_ntin = Number(kiIS?.output?.[0]?.thtr_ntin ?? 0) * ONE_HUNDRED_MILLION;

    const ROE = (thtr_ntin / total_cptl) * 100;
    const lstn = Number(kiChart?.output1?.lstn_stcn ?? 1);
    const prpr = Number(kiChart?.output1?.stck_prpr ?? 0);

    const step = 0.5;
    const rangeCount = 3;

    let keList = [];
    for (let i = -rangeCount; i <= rangeCount; i++) {
        keList.push(baseKe + (i * step));
    }

    const rows = keList.map(ke => {
        const value = total_cptl * (ROE / ke);
        const target = value / lstn;
        const returnPct = (target / prpr - 1) * 100;

        return {
            multiplier: `${ke.toFixed(1)}%`,
            returnPct: Number(returnPct.toFixed(2)),
            targetPrice: Math.round(target)
        };
    });

    return {
        title: "S-RIM 가치 평가 모델",
        description: "사경인 회계사의 한국형 초과이익가치 평가 모델입니다.",
        formula: "적정 가치 = 자기자본 × (ROE / 요구수익률)",
        headers: ["요구수익률 기준(Ke)", "기대 수익률", "적정 주가"],
        rows,
        metrics: [
            { label: "ROE (자기자본이익률)", value: `${ROE.toFixed(2)}%` },
            { label: "자기자본 (Equity)", value: `${(total_cptl / ONE_HUNDRED_MILLION).toLocaleString()}억 원` },
            { label: "현재가 (Price)", value: `${prpr.toLocaleString()}원` }
        ],
        footerNotice: "요구수익률(Ke)은 투자자가 기대하는 최소 수익률이며, 보통 BBB- 회사채 수익률을 참고합니다."
    };
}

/**
 * 미국 주식 NCAV 계산 로직 (구조화된 객체 반환)
 */
export function calculateUsNcav(finnhub: any, detail: any): ValuationResult | string {
    const bs = finnhub?.data?.[0]?.report?.bs ?? [];

    const cras = Number(
        bs.find((i: any) => i.concept.includes("us-gaap_AssetsCurrent"))?.value ??
        bs.find((i: any) => i.concept.includes("AssetsCurrent"))?.value ?? 0
    );

    const lblt = Number(
        bs.find((i: any) => i.concept.includes("us-gaap_Liabilities"))?.value ??
        bs.find((i: any) => i.concept.includes("Liabilities"))?.value ?? 0
    );

    const rawShar = detail?.output?.shar;
    const last = Number(detail?.output?.last || 0);

    const isDelisted = !rawShar || rawShar === "" || Number(rawShar) === 0;
    const isMissingPrice = last === 0;

    if (isDelisted || isMissingPrice) {
        return "ERROR_INSUFFICIENT_DATA";
    }

    const lstn = Number(rawShar);
    const netCurrentAsset = cras - lblt;
    const target = netCurrentAsset / lstn;

    const rows = [1.0, 1.2, 1.5].map(r => {
        const adjustedTarget = target / r;
        const returnPct = (adjustedTarget / last - 1) * 100;

        return {
            multiplier: `${r.toFixed(1)}배`,
            returnPct: Number(returnPct.toFixed(2)),
            targetPrice: Number(adjustedTarget.toFixed(2))
        };
    });

    return {
        title: "미국 NCAV 가치 평가 모델",
        description: "Benjamin Graham's Net Current Asset Value Asset-driven Strategy.",
        formula: "NCAV (Net Current Asset Value) = Current Assets - Total Liabilities",
        headers: ["평가 기준 (배수)", "기대 수익률", "적정 주가"],
        rows,
        metrics: [
            { label: "순유동자산 (NCAV)", value: `$${(netCurrentAsset / 1000000).toLocaleString()}M` },
            { label: "총부채 (Liabilities)", value: `$${(lblt / 1000000).toLocaleString()}M` },
            { label: "현재가 (Price)", value: `$${last.toLocaleString()}` }
        ],
        footerNotice: "NCAV(청산가치)가 현재 시가총액보다 높은 기업은 매우 강력한 내재 자산 가치를 지닌 것으로 평가됩니다."
    };
}

/**
 * 미국 주식 S-RIM 계산 로직 (구조화된 객체 반환)
 */
export function calculateUsSRIM(finnhub: any, detail: any, baseKe: number = 8.0): ValuationResult | string {
    const bs = finnhub?.data?.[0]?.report?.bs ?? [];
    const ic = finnhub?.data?.[0]?.report?.ic ?? [];

    const total_equity = Number(
        bs.find((i: any) => i.concept.includes("us-gaap_StockholdersEquity"))?.value ??
        bs.find((i: any) => i.concept.includes("StockholdersEquity"))?.value ?? 1
    );

    const net_income = Number(
        ic.find((i: any) => i.concept.includes("us-gaap_NetIncomeLoss"))?.value ??
        ic.find((i: any) => i.concept.includes("NetIncome"))?.value ?? 0
    );

    const ROE = (net_income / total_equity) * 100;
    const last = Number(detail?.output?.last || 0);
    const shar = Number(detail?.output?.shar || 0);

    if (last === 0 || shar === 0) {
        return "ERROR_INSUFFICIENT_DATA";
    }

    const step = 0.5;
    const rangeCount = 3;
    let keList = [];
    for (let i = -rangeCount; i <= rangeCount; i++) {
        keList.push(baseKe + (i * step));
    }

    const rows = keList.map(ke => {
        const value = total_equity * (ROE / ke);
        const target = value / shar;
        const returnPct = (target / last - 1) * 100;

        return {
            multiplier: `${ke.toFixed(1)}%`,
            returnPct: Number(returnPct.toFixed(2)),
            targetPrice: Number(target.toFixed(2))
        };
    });

    return {
        title: "미국 S-RIM 가치 평가 모델",
        description: "Residual Income Valuation Model adjusted for US Securities.",
        formula: "Fair Value = Shareholders Equity × (ROE / Required Return)",
        headers: ["요구수익률 기준(Ke)", "기대 수익률", "적정 주가"],
        rows,
        metrics: [
            { label: "ROE (자기자본이익률)", value: `${ROE.toFixed(2)}%` },
            { label: "자기자본 (Equity)", value: `$${(total_equity / 1000000).toLocaleString()}M` },
            { label: "현재가 (Price)", value: `$${last.toLocaleString()}` }
        ],
        footerNotice: "미국 주식의 Ke는 보통 미국 10년물 국채 금리에 리스크 프리미엄을 더한 7~9% 수준을 주로 사용합니다."
    };
}

// --- 하단 레거시 계산 함수 데이터 가공 표준화 유지보수 영역 ---
export function calculateKrNcavValue(kiBS: any, kiChart: any) {
    const cras = Number(kiBS?.output?.[0]?.cras ?? 0) * ONE_HUNDRED_MILLION;
    const lblt = Number(kiBS?.output?.[0]?.total_lblt ?? 0) * ONE_HUNDRED_MILLION;
    const lstn = Number(kiChart?.output1?.lstn_stcn ?? 1);
    const target = (cras - lblt) / lstn;
    return Number(target.toFixed(0));
}

export function calculateKrNcavRatio(kiBS: any, kiChart: any) {
    const cras = Number(kiBS.output?.[0]?.cras ?? 0) * ONE_HUNDRED_MILLION;
    const lblt = Number(kiBS.output?.[0]?.total_lblt ?? 0) * ONE_HUNDRED_MILLION;
    const lstn = Number(kiChart?.output1?.lstn_stcn ?? 1);
    const prpr = Number(kiChart?.output1?.stck_prpr ?? 0);

    const target = (cras - lblt) / lstn;
    const returnPct = ((target / prpr) - 1) * 100;
    return Number(returnPct.toFixed(2));
}

export function getKrNcavGrade(kiBS: any, kiChart: any) {
    const cras = Number(kiBS.output?.[0]?.cras || 0) * ONE_HUNDRED_MILLION;
    const lblt = Number(kiBS.output?.[0]?.total_lblt || 0) * ONE_HUNDRED_MILLION;
    const lstn = Number(kiChart?.output1?.lstn_stcn ?? 1);
    const prpr = Number(kiChart?.output1?.stck_prpr ?? 0);

    if (!lstn || !prpr) return { grade: "N/A", color: "text-zinc-400", cardGradeColor: "from-zinc-500/20 to-zinc-500/5" };

    const targetPrice = (cras - lblt) / lstn;
    const returnPct = ((targetPrice / prpr) - 1) * 100;

    if (returnPct >= 200) return { grade: "SSS", color: "text-yellow-500", cardGradeColor: "from-yellow-500/30 via-amber-500/10 to-transparent" };
    if (returnPct >= 150) return { grade: "SS", color: "text-yellow-400", cardGradeColor: "from-yellow-400/20 via-orange-400/5 to-transparent" };
    if (returnPct >= 100) return { grade: "S", color: "text-orange-500", cardGradeColor: "from-orange-500/20 to-transparent" };
    if (returnPct >= 50) return { grade: "A", color: "text-green-500", cardGradeColor: "from-green-500/15 to-transparent" };
    if (returnPct >= 0) return { grade: "B", color: "text-blue-500", cardGradeColor: "from-blue-500/10 to-transparent" };
    return { grade: "F", color: "text-red-500", cardGradeColor: "from-red-500/20 via-red-900/10 to-transparent" };
}

export function getKrSRIMTargetPrice(kiBS: any, kiIS: any, kiChart: any, baseKe: number = 8.0) {
    const total_cptl = Number(kiBS?.output?.[0]?.total_cptl ?? 1) * ONE_HUNDRED_MILLION;
    const thtr_ntin = Number(kiIS?.output?.[0]?.thtr_ntin ?? 0) * ONE_HUNDRED_MILLION;
    const ROE = (thtr_ntin / total_cptl) * 100;
    const lstn = Number(kiChart?.output1?.lstn_stcn ?? 1) === 0 ? 1 : Number(kiChart?.output1?.lstn_stcn ?? 1);
    const targetPrice = (total_cptl * (ROE / baseKe)) / lstn;
    return `(요구수익률 ${baseKe}% 기준) 적정주가: ₩${Math.round(targetPrice)}`;
}

export function calculateUsNcavValue(finnhub: any, detail: any) {
    const bs = finnhub?.data?.[0]?.report?.bs ?? [];
    const cras = Number(bs.find((i: any) => i.concept.includes("us-gaap_AssetsCurrent"))?.value ?? 0);
    const lblt = Number(bs.find((i: any) => i.concept.includes("us-gaap_Liabilities"))?.value ?? 0);
    const rawShar = detail?.output?.shar;
    if (!rawShar || rawShar === "" || Number(rawShar) === 0) return "0.00";
    return ((cras - lblt) / Number(rawShar)).toFixed(2);
}

export function calculateUsNcavRatio(finnhub: any, detail: any) {
    const bs = finnhub?.data?.[0]?.report?.bs ?? [];
    const cras = Number(bs.find((i: any) => i.concept.includes("us-gaap_AssetsCurrent"))?.value ?? 0);
    const lblt = Number(bs.find((i: any) => i.concept.includes("us-gaap_Liabilities"))?.value ?? 0);
    const rawShar = detail?.output?.shar;
    const last = Number(detail?.output?.last || 0);
    if (!rawShar || rawShar === "" || Number(rawShar) === 0 || last === 0) return 0;
    const target = (cras - lblt) / Number(rawShar);
    return Number((((target / last) - 1) * 100).toFixed(2));
}

export function getUsNcavGrade(finnhub: any, detail: any) {
    const bs = finnhub?.data?.[0]?.report?.bs ?? [];
    const cras = Number(bs.find((i: any) => i.concept.includes("us-gaap_AssetsCurrent"))?.value ?? 0);
    const lblt = Number(bs.find((i: any) => i.concept.includes("us-gaap_Liabilities"))?.value ?? 0);
    const lstn = Number(detail.output?.shar || 1);
    const last = Number(detail.output?.last || 1);
    const targetPrice = (cras - lblt) / lstn;
    const returnPct = ((targetPrice / last) - 1) * 100;

    if (returnPct >= 200) return { grade: "SSS", color: "text-yellow-500", cardGradeColor: "from-yellow-500/30 via-amber-500/10 to-transparent" };
    if (returnPct >= 150) return { grade: "SS", color: "text-yellow-400", cardGradeColor: "from-yellow-400/20 via-orange-400/5 to-transparent" };
    if (returnPct >= 100) return { grade: "S", color: "text-orange-500", cardGradeColor: "from-orange-500/20 to-transparent" };
    if (returnPct >= 50) return { grade: "A", color: "text-green-500", cardGradeColor: "from-green-500/15 to-transparent" };
    if (returnPct >= 0) return { grade: "B", color: "text-blue-500", cardGradeColor: "from-blue-500/10 to-transparent" };
    return { grade: "F", color: "text-red-500", cardGradeColor: "from-red-500/20 via-red-900/10 to-transparent" };
}

export function formatKoreanUnit(value: number | string): string {
    const num = Number(value);
    if (isNaN(num) || num === 0) return "0";
    const absoluteValue = Math.abs(num);
    if (absoluteValue >= 1000000000000) return (num / 1000000000000).toFixed(2) + "조";
    if (absoluteValue >= 100000000) return (num / 100000000).toLocaleString(undefined, { maximumFractionDigits: 0 }) + "억";
    return num.toLocaleString();
}