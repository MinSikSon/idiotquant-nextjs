export const ONE_HUNDRED_MILLION = 100000000;

// 이미 억 단위인 값을 조/억으로 포맷 (접미사 없음)
export function fmtJoEok(eok: number): string {
  const abs = Math.abs(eok);
  const sign = eok < 0 ? "-" : "";
  if (abs >= 10000) {
    const jo = Math.floor(abs / 10000);
    const rem = Math.round(abs % 10000);
    return rem > 0
      ? `${sign}${jo.toLocaleString()}조 ${rem.toLocaleString()}억`
      : `${sign}${jo.toLocaleString()}조`;
  }
  return `${sign}${Math.round(abs).toLocaleString()}억`;
}

// 원 단위 값을 조/억 원으로 포맷
export function fmtEok(won: number): string {
  const abs = Math.abs(won);
  const sign = won < 0 ? "-" : "";
  const eok = Math.round(abs / ONE_HUNDRED_MILLION);
  if (eok >= 10000) {
    const jo = Math.floor(eok / 10000);
    const rem = eok % 10000;
    return rem > 0
      ? `${sign}${jo.toLocaleString()}조 ${rem.toLocaleString()}억 원`
      : `${sign}${jo.toLocaleString()}조 원`;
  }
  return `${sign}${eok.toLocaleString()}억 원`;
}

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

// Finnhub 인터페이스 바인딩
interface FinnhubFinancialsAsReportedDataReportCommonType {
    label: string;
    value: string;
    unit: string;
    concept: string;
    form: string;
}

interface FinnhubFinancialsAsReportedDataReportType {
    bs: FinnhubFinancialsAsReportedDataReportCommonType[];
    ic: FinnhubFinancialsAsReportedDataReportCommonType[];
    cf: FinnhubFinancialsAsReportedDataReportCommonType[];
}

interface FinnhubFinancialsAsReportedDataType {
    symbol: number;
    year: number;
    quarter: number;
    startDate: string;
    endDate: string;
    form: string;
    accessNumber: string;
    acceptedDate: string;
    filedDate: string;
    cik: string;
    report: FinnhubFinancialsAsReportedDataReportType;
}

export interface FinnhubFinancialsAsReportedType {
    state: "init" | "pending" | "fulfilled" | "rejected";
    cik: string;
    data: FinnhubFinancialsAsReportedDataType[];
    symbol: string;
}

// ============================================================================
// [재무 데이터 안전 추출 헬퍼 함수 - us-gaap_ 접두사 완벽 대응]
// ============================================================================
function findFinnhubValue(list: FinnhubFinancialsAsReportedDataReportCommonType[], targetConcepts: string[]): number {
    if (!list || !Array.isArray(list)) return 0;

    // 비교 편의를 위해 찾고자 하는 concept 목록에서 'us-gaap_'을 제거한 순수 이름들을 준비합니다.
    const cleanTargets = targetConcepts.map(c => c.replace(/^us-gaap_/, ""));

    for (const target of cleanTargets) {
        const item = list.find(i => {
            if (!i.concept) return false;
            // 리포트 데이터에 들어있는 concept에서도 'us-gaap_' 접두사를 제거하고 비교합니다.
            const cleanItemConcept = i.concept.replace(/^us-gaap_/, "");
            return cleanItemConcept === target;
        });

        if (item && item.value !== undefined) {
            return Number(item.value);
        }
    }
    return 0;
}

// ============================================================================
// [1] 한국 주식 가치 평가 모델 연산 세트 (KRX)
// ============================================================================

export function calculateKrNcav(kiBS: any, kiChart: any): ValuationResult {
    const cras = Number(kiBS?.output?.[0]?.cras ?? 0) * ONE_HUNDRED_MILLION;
    const lblt = Number(kiBS?.output?.[0]?.total_lblt ?? 0) * ONE_HUNDRED_MILLION;
    const lstn = Number(kiChart?.output1?.lstn_stcn ?? 1);
    const prpr = Number(kiChart?.output1?.stck_prpr ?? 0);

    const netCurrentAsset = cras - lblt;
    const target = netCurrentAsset / lstn;

    const rows = [1.0, 1.2, 1.5].map(r => {
        const adjustedTarget = target / r;
        const returnPct = prpr > 0 ? (adjustedTarget / prpr - 1) * 100 : 0;
        return {
            multiplier: `${r.toFixed(1)}배`,
            returnPct: Number(returnPct.toFixed(2)),
            targetPrice: Math.max(0, Math.round(adjustedTarget))
        };
    });

    return {
        title: "NCAV 청산가치 모델",
        description: "벤자민 그레이엄의 청산가치 기반 계량 모델입니다.",
        formula: "NCAV = 유동자산 - 총부채",
        headers: ["가중치 (배수)", "기대 수익률", "적정 주가"],
        rows,
        metrics: [
            { label: "순유동자산", value: `${fmtEok(netCurrentAsset)}` },
            { label: "총부채", value: `${fmtEok(lblt)}` },
            { label: "현재가", value: `${prpr.toLocaleString()}원` }
        ],
        footerNotice: "시가총액이 순유동자산의 2/3(약 0.67배) 이하일 때 강력한 자산 안전마진 확보로 간주합니다."
    };
}

export function calculateKrSRIM(kiBS: any, kiIS: any, kiChart: any, baseKe: number = 8.0): ValuationResult {
    const total_cptl = Number(kiBS?.output?.[0]?.total_cptl ?? 1) * ONE_HUNDRED_MILLION;
    const thtr_ntin = Number(kiIS?.output?.[0]?.thtr_ntin ?? 0) * ONE_HUNDRED_MILLION;
    const lstn = Number(kiChart?.output1?.lstn_stcn ?? 1);
    const prpr = Number(kiChart?.output1?.stck_prpr ?? 0);

    const ROE = total_cptl > 0 ? (thtr_ntin / total_cptl) * 100 : 0;
    const step = 0.5;
    const rangeCount = 1;
    let keList = [];
    for (let i = -rangeCount; i <= rangeCount; i++) {
        keList.push(baseKe + (i * step));
    }

    const rows = keList.map(ke => {
        const target = ke > 0 ? (total_cptl * (ROE / ke)) / lstn : 0;
        const returnPct = prpr > 0 ? (target / prpr - 1) * 100 : 0;
        return {
            multiplier: `${ke.toFixed(1)}%`,
            returnPct: Number(returnPct.toFixed(2)),
            targetPrice: Math.max(0, Math.round(target))
        };
    });

    return {
        title: "S-RIM 초과수익 모델",
        description: "사경인 회계사의 한국형 초과이익가치 평가 모델입니다.",
        formula: "적정 가치 = 자기자본 × (ROE / 요구수익률)",
        headers: ["요구수익률 (Ke)", "기대 수익률", "적정 주가"],
        rows,
        metrics: [
            { label: "ROE", value: `${ROE.toFixed(2)}%` },
            { label: "자본총계", value: `${fmtEok(total_cptl)}` },
            { label: "현재가", value: `${prpr.toLocaleString()}원` }
        ],
        footerNotice: "요구수익률(Ke)은 투자자가 기대하는 최소 한계치이며, 보통 BBB- 회사채 수익률을 준용합니다."
    };
}

export function calculateKrDCF(kiCF: any, kiChart: any, wacc: number = 10.0, terminalGrowth: number = 2.0): ValuationResult {
    const ocf = Number(kiCF?.output?.[0]?.bspl_cclo ?? 0) * ONE_HUNDRED_MILLION;
    const lstn = Number(kiChart?.output1?.lstn_stcn ?? 1);
    const prpr = Number(kiChart?.output1?.stck_prpr ?? 0);

    const discountRate = wacc / 100;
    
    const computeDcfValue = (tgRate: number) => {
        let totalPresentValue = 0;
        let tempFcf = ocf;
        for (let i = 1; i <= 5; i++) {
            tempFcf = tempFcf * (1 + tgRate);
            totalPresentValue += tempFcf / Math.pow(1 + discountRate, i);
        }
        const terminalValue = (tempFcf * (1 + tgRate)) / (discountRate - tgRate);
        const pvTerminalValue = terminalValue / Math.pow(1 + discountRate, 5);
        return totalPresentValue + pvTerminalValue;
    };

    const baseG = terminalGrowth / 100;
    const rows = [baseG - 0.005, baseG, baseG + 0.005].map(tg => {
        const ev = computeDcfValue(tg);
        const target = ev / lstn;
        const returnPct = prpr > 0 ? (target / prpr - 1) * 100 : 0;
        return {
            multiplier: `영구성장 ${(tg * 100).toFixed(1)}%`,
            returnPct: Number(returnPct.toFixed(2)),
            targetPrice: Math.max(0, Math.round(target))
        };
    });

    return {
        title: "DCF 현금흐름할인 모델",
        description: "미래 5개년 영업 현금 흐름을 WACC 할인율로 현가화한 모델입니다.",
        formula: "기업가치 = ∑[FCF / (1+WACC)^t] + [Terminal Value / (1+WACC)^5]",
        headers: ["성장률 영구 시나리오", "기대 수익률", "적정 주가"],
        rows,
        metrics: [
            { label: "영업현금흐름", value: `${fmtEok(ocf)}` },
            { label: "할인율", value: `${wacc.toFixed(1)}%` },
            { label: "현재가", value: `${prpr.toLocaleString()}원` }
        ],
        footerNotice: "영업활동현금흐름(OCF)을 FCF의 대용치로 보수적으로 할인하여 절대적 내재가치를 도출합니다."
    };
}

export function calculateKrMultipliers(kiBS: any, kiIS: any, kiChart: any): ValuationResult {
    const total_cptl = Number(kiBS?.output?.[0]?.total_cptl ?? 1) * ONE_HUNDRED_MILLION;
    const thtr_ntin = Number(kiIS?.output?.[0]?.thtr_ntin ?? 0) * ONE_HUNDRED_MILLION;
    const lstn = Number(kiChart?.output1?.lstn_stcn ?? 1);
    const prpr = Number(kiChart?.output1?.stck_prpr ?? 0);

    const eps = thtr_ntin / lstn;
    const bps = total_cptl / lstn;

    const rows = [8.0, 10.0, 12.0].map(targetPer => {
        const target = eps * targetPer;
        const returnPct = prpr > 0 ? (target / prpr - 1) * 100 : 0;
        return {
            multiplier: `Target PER ${targetPer.toFixed(1)}배`,
            returnPct: Number(returnPct.toFixed(2)),
            targetPrice: Math.max(0, Math.round(target))
        };
    });

    return {
        title: "PER Multiplier 모델",
        description: "수익성 지표에 적정 주가수익배수 타겟을 적용하여 산출합니다.",
        formula: "적정 주가 = EPS × Target PER",
        headers: ["타겟 멀티플 배수", "기대 수익률", "적정 주가"],
        rows,
        metrics: [
            { label: "주당순이익", value: `${Math.round(eps).toLocaleString()}원` },
            { label: "주당순자산", value: `${Math.round(bps).toLocaleString()}원` },
            { label: "현재가", value: `${prpr.toLocaleString()}원` }
        ],
        footerNotice: "업종 평균 멀티플 밴드와 비교하여 현재 주가의 상대적 위치를 트래킹합니다."
    };
}

export function calculateKrPbrBand(kiBS: any, kiChart: any): ValuationResult {
    const total_cptl = Number(kiBS?.output?.[0]?.total_cptl ?? 1) * ONE_HUNDRED_MILLION;
    const lstn = Number(kiChart?.output1?.lstn_stcn ?? 1);
    const prpr = Number(kiChart?.output1?.stck_prpr ?? 0);

    const bps = total_cptl / lstn;

    const rows = [0.6, 1.0, 1.4].map(targetPbr => {
        const target = bps * targetPbr;
        const returnPct = prpr > 0 ? (target / prpr - 1) * 100 : 0;
        return {
            multiplier: `Target PBR ${targetPbr.toFixed(1)}배`,
            returnPct: Number(returnPct.toFixed(2)),
            targetPrice: Math.max(0, Math.round(target))
        };
    });

    return {
        title: "PBR 밴드 청산가치 모델",
        description: "순자산(장부가치) 대비 주가배율 밴드를 적용한 모델입니다.",
        formula: "적정 주가 = BPS × Target PBR",
        headers: ["타겟 PBR 배수", "기대 수익률", "적정 주가"],
        rows,
        metrics: [
            { label: "주당순자산", value: `${Math.round(bps).toLocaleString()}원` },
            { label: "자본총계", value: `${fmtEok(total_cptl)}` },
            { label: "현재가", value: `${prpr.toLocaleString()}원` }
        ],
        footerNotice: "전통적 제조업이나 저PBR 밸류업 프로그램 대상 기업의 자산 하방 경직성을 확인하는 데 유용합니다."
    };
}

// ============================================================================
// [2] 미국 주식 가치 평가 모델 연산 세트 (NYSE/NASDAQ)
// ============================================================================

export function calculateUsNcav(finnhub: FinnhubFinancialsAsReportedType, detail: any): ValuationResult | string {
    const bs = finnhub?.data?.[0]?.report?.bs ?? [];
    
    // us-gaap_ 유무와 상관없이 매칭 처리
    const cras = findFinnhubValue(bs, ["AssetsCurrent"]);
    const lblt = findFinnhubValue(bs, ["Liabilities", "LiabilitiesTotal"]);
    
    const rawShar = detail?.output?.shar;
    const last = Number(detail?.output?.last || 0);

    if (!rawShar || rawShar === "" || Number(rawShar) === 0 || last === 0) return "ERROR_INSUFFICIENT_DATA";

    const lstn = Number(rawShar);
    const netCurrentAsset = cras - lblt;
    const target = netCurrentAsset / lstn;

    const rows = [1.0, 1.2, 1.5].map(r => {
        const adjustedTarget = target / r;
        const returnPct = (adjustedTarget / last - 1) * 100;
        return {
            multiplier: `${r.toFixed(1)}배`,
            returnPct: Number(returnPct.toFixed(2)),
            targetPrice: Number(Math.max(0, adjustedTarget).toFixed(2))
        };
    });

    return {
        title: "미국 NCAV 청산가치 모델",
        description: "Benjamin Graham's Asset-driven Strategy.",
        formula: "NCAV = Current Assets - Total Liabilities",
        headers: ["평가 기준 (배수)", "기대 수익률", "적정 주가"],
        rows,
        metrics: [
            { label: "순유동자산", value: `$${(netCurrentAsset / 1000000).toLocaleString()}M` },
            { label: "총부채", value: `$${(lblt / 1000000).toLocaleString()}M` },
            { label: "현재가", value: `$${last.toLocaleString()}` }
        ],
        footerNotice: "청산가치가 시가총액을 압도하는 극단적 저평가 기업 발굴용 기법입니다."
    };
}

export function calculateUsSRIM(finnhub: FinnhubFinancialsAsReportedType, detail: any, baseKe: number = 8.0): ValuationResult | string {
    const bs = finnhub?.data?.[0]?.report?.bs ?? [];
    const ic = finnhub?.data?.[0]?.report?.ic ?? [];

    const total_equity = findFinnhubValue(bs, ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"]);
    const net_income = findFinnhubValue(ic, ["NetIncomeLoss", "NetIncomeLossAvailableToCommonStockholdersBasic"]);
    
    const last = Number(detail?.output?.last || 0);
    const shar = Number(detail?.output?.shar || 0);

    if (last === 0 || shar === 0) return "ERROR_INSUFFICIENT_DATA";

    const ROE = total_equity > 0 ? (net_income / total_equity) * 100 : 0;
    const rows = [baseKe - 0.5, baseKe, baseKe + 0.5].map(ke => {
        const target = ke > 0 ? (total_equity * (ROE / ke)) / shar : 0;
        const returnPct = (target / last - 1) * 100;
        return {
            multiplier: `${ke.toFixed(1)}%`,
            returnPct: Number(returnPct.toFixed(2)),
            targetPrice: Number(Math.max(0, target).toFixed(2))
        };
    });

    return {
        title: "미국 S-RIM 모델",
        description: "Residual Income Valuation Model for US Securities.",
        formula: "Fair Value = Equity × (ROE / Ke)",
        headers: ["요구수익률 기준(Ke)", "기대 수익률", "적정 주가"],
        rows,
        metrics: [
            { label: "ROE", value: `${ROE.toFixed(2)}%` },
            { label: "자본총계", value: `$${(total_equity / 1000000).toLocaleString()}M` },
            { label: "현재가", value: `$${last.toLocaleString()}` }
        ],
        footerNotice: "미국 채권 시장 벤치마크 수익률 스프레드를 가산하여 안전마진을 가산합니다."
    };
}

export function calculateUsPEG(finnhub: FinnhubFinancialsAsReportedType, detail: any, defaultGrowthRate: number = 15.0): ValuationResult | string {
    const ic = finnhub?.data?.[0]?.report?.ic ?? [];
    const last = Number(detail?.output?.last || 0);
    const shar = Number(detail?.output?.shar || 0);

    if (last === 0 || shar === 0) return "ERROR_INSUFFICIENT_DATA";

    const net_income = findFinnhubValue(ic, ["NetIncomeLoss", "NetIncomeLossAvailableToCommonStockholdersBasic"]);
    const eps = net_income / shar;
    const currentPer = eps > 0 ? last / eps : 0;

    const rows = [0.5, 1.0, 1.5].map(peg => {
        const targetPrice = eps * defaultGrowthRate * peg;
        const returnPct = (targetPrice / last - 1) * 100;
        return {
            multiplier: `PEG ${peg.toFixed(1)}배 기준`,
            returnPct: Number(returnPct.toFixed(2)),
            targetPrice: Number(Math.max(0, targetPrice).toFixed(2))
        };
    });

    return {
        title: "미국 주식 PEG 가치성장 모델",
        description: "피터 린치의 성장성 대비 주가 수익 비율 밸류에이션 모델입니다.",
        formula: "Target Price = EPS × 이익성장률 × Target PEG",
        headers: ["Target PEG", "기대 수익률", "적정 주가"],
        rows,
        metrics: [
            { label: "Trailing PER", value: `${currentPer.toFixed(1)}배` },
            { label: "가정 성장률", value: `${defaultGrowthRate.toFixed(1)}%` },
            { label: "현재가", value: `$${last.toLocaleString()}` }
        ],
        footerNotice: "PEG 지표가 1.0배 미만이면 성장 속도 대비 주가가 저렴함을 뜻합니다."
    };
}

export function calculateUsDCF(finnhub: FinnhubFinancialsAsReportedType, detail: any, wacc: number = 9.0, terminalGrowth: number = 2.5): ValuationResult | string {
    const cf = finnhub?.data?.[0]?.report?.cf ?? [];
    const last = Number(detail?.output?.last || 0);
    const shar = Number(detail?.output?.shar || 0);

    if (last === 0 || shar === 0) return "ERROR_INSUFFICIENT_DATA";

    const ocf = findFinnhubValue(cf, ["NetCashProvidedByUsedInOperatingActivities"]);
    const discountRate = wacc / 100;

    const computeUsDcfValue = (tgRate: number) => {
        let totalPresentValue = 0;
        let tempFcf = ocf;
        for (let i = 1; i <= 5; i++) {
            tempFcf = tempFcf * (1 + tgRate);
            totalPresentValue += tempFcf / Math.pow(1 + discountRate, i);
        }
        const terminalValue = (tempFcf * (1 + tgRate)) / (discountRate - tgRate);
        const pvTerminalValue = terminalValue / Math.pow(1 + discountRate, 5);
        return totalPresentValue + pvTerminalValue;
    };

    const baseG = terminalGrowth / 100;
    const rows = [baseG - 0.005, baseG, baseG + 0.005].map(tg => {
        const ev = computeUsDcfValue(tg);
        const target = ev / shar;
        const returnPct = (target / last - 1) * 100;
        return {
            multiplier: `영구성장 ${(tg * 100).toFixed(1)}%`,
            returnPct: Number(returnPct.toFixed(2)),
            targetPrice: Number(Math.max(0, target).toFixed(2))
        };
    });

    return {
        title: "미국 주식 DCF 현금흐름 모델",
        description: "미래 5개년 현금 인프라에 자본비용을 반영한 전통 할인 모델입니다.",
        formula: "Fair Value = [∑PV of FCF] + PV of Terminal Value",
        headers: ["영구 성장률", "기대 수익률", "적정 주가"],
        rows,
        metrics: [
            { label: "영업현금흐름", value: `$${(ocf / 1000000).toLocaleString()}M` },
            { label: "할인율", value: `${wacc.toFixed(1)}%` },
            { label: "현재가", value: `$${last.toLocaleString()}` }
        ],
        footerNotice: "빅테크 및 성숙기 기업의 현금 생성 능력 가치를 절대 연산합니다."
    };
}

export function calculateUsMultipliers(finnhub: FinnhubFinancialsAsReportedType, detail: any): ValuationResult | string {
    const ic = finnhub?.data?.[0]?.report?.ic ?? [];
    const last = Number(detail?.output?.last || 0);
    const shar = Number(detail?.output?.shar || 0);

    if (last === 0 || shar === 0) return "ERROR_INSUFFICIENT_DATA";

    const net_income = findFinnhubValue(ic, ["NetIncomeLoss", "NetIncomeLossAvailableToCommonStockholdersBasic"]);
    const eps = net_income / shar;

    const rows = [15.0, 20.0, 25.0].map(targetPer => {
        const target = eps * targetPer;
        const returnPct = (target / last - 1) * 100;
        return {
            multiplier: `Target PER ${targetPer.toFixed(1)}배`,
            returnPct: Number(returnPct.toFixed(2)),
            targetPrice: Number(Math.max(0, target).toFixed(2))
        };
    });

    return {
        title: "미국 주식 PER Multiplier 모델",
        description: "미국 S&P500 및 동종 멀티플을 적용한 가치 추정 모델입니다.",
        formula: "적정 주가 = Net Income / Shares × Target PER",
        headers: ["타겟 PER 배수", "기대 수익률", "적정 주가"],
        rows,
        metrics: [
            { label: "주당순이익", value: `$${eps.toFixed(2)}` },
            { label: "순이익", value: `$${(net_income / 1000000).toLocaleString()}M` },
            { label: "현재가", value: `$${last.toLocaleString()}` }
        ],
        footerNotice: "고성장 기술주나 전통 소비재의 상대적 밸류에이션 위치를 가늠합니다."
    };
}

// ============================================================================
// [3] 레거시 호환 및 하단 바인딩 영역 완벽 보존
// ============================================================================

export function calculateKrNcavValue(kiBS: any, kiChart: any) {
    const cras = Number(kiBS?.output?.[0]?.cras ?? 0) * ONE_HUNDRED_MILLION;
    const lblt = Number(kiBS?.output?.[0]?.total_lblt ?? 0) * ONE_HUNDRED_MILLION;
    const lstn = Number(kiChart?.output1?.lstn_stcn ?? 1);
    return Number(((cras - lblt) / lstn).toFixed(0));
}

export function calculateKrNcavRatio(kiBS: any, kiChart: any) {
    const cras = Number(kiBS.output?.[0]?.cras ?? 0) * ONE_HUNDRED_MILLION;
    const lblt = Number(kiBS.output?.[0]?.total_lblt ?? 0) * ONE_HUNDRED_MILLION;
    const lstn = Number(kiChart?.output1?.lstn_stcn ?? 1);
    const prpr = Number(kiChart?.output1?.stck_prpr ?? 0);
    const target = (cras - lblt) / lstn;
    return prpr > 0 ? Number((((target / prpr) - 1) * 100).toFixed(2)) : 0;
}

export function getKrNcavGrade(kiBS: any, kiChart: any) {
    const cras = Number(kiBS.output?.[0]?.cras || 0) * ONE_HUNDRED_MILLION;
    const lblt = Number(kiBS.output?.[0]?.total_lblt || 0) * ONE_HUNDRED_MILLION;
    const lstn = Number(kiChart?.output1?.lstn_stcn ?? 1);
    const prpr = Number(kiChart?.output1?.stck_prpr ?? 0);
    if (!lstn || !prpr) return { grade: "N/A", color: "text-neutral-400", cardGradeColor: "from-zinc-500/20 to-zinc-500/5" };
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
    const ROE = total_cptl > 0 ? (thtr_ntin / total_cptl) * 100 : 0;
    const lstn = Number(kiChart?.output1?.lstn_stcn ?? 1) === 0 ? 1 : Number(kiChart?.output1?.lstn_stcn ?? 1);
    const targetPrice = baseKe > 0 ? (total_cptl * (ROE / baseKe)) / lstn : 0;
    return `(요구수익률 ${baseKe}% 기준) 적정주가: ₩${Math.round(targetPrice).toLocaleString()}`;
}

export function calculateUsNcavValue(finnhub: FinnhubFinancialsAsReportedType, detail: any) {
    const bs = finnhub?.data?.[0]?.report?.bs ?? [];
    const cras = findFinnhubValue(bs, ["AssetsCurrent"]);
    const lblt = findFinnhubValue(bs, ["Liabilities", "LiabilitiesTotal"]);
    const rawShar = detail?.output?.shar;
    if (!rawShar || rawShar === "" || Number(rawShar) === 0) return "0.00";
    return ((cras - lblt) / Number(rawShar)).toFixed(2);
}

export function calculateUsNcavRatio(finnhub: FinnhubFinancialsAsReportedType, detail: any) {
    const bs = finnhub?.data?.[0]?.report?.bs ?? [];
    const cras = findFinnhubValue(bs, ["AssetsCurrent"]);
    const lblt = findFinnhubValue(bs, ["Liabilities", "LiabilitiesTotal"]);
    const rawShar = detail?.output?.shar;
    const last = Number(detail?.output?.last || 0);
    if (!rawShar || rawShar === "" || Number(rawShar) === 0 || last === 0) return 0;
    return Number(((((cras - lblt) / Number(rawShar) / last) - 1) * 100).toFixed(2));
}

export function getUsNcavGrade(finnhub: FinnhubFinancialsAsReportedType, detail: any) {
    const bs = finnhub?.data?.[0]?.report?.bs ?? [];
    const cras = findFinnhubValue(bs, ["AssetsCurrent"]);
    const lblt = findFinnhubValue(bs, ["Liabilities", "LiabilitiesTotal"]);
    const lstn = Number(detail.output?.shar || 1);
    const last = Number(detail.output?.last || 1);
    const returnPct = (((cras - lblt) / lstn / last) - 1) * 100;
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