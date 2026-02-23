export const ONE_HUNDRED_MILLION = 100000000;

/**
 * 한국 NCAV 계산 로직
 */
export function calculateKrNcav(kiBS: any, kiChart: any) {
    const cras = Number(kiBS.output[0]?.cras || 0) * ONE_HUNDRED_MILLION;
    const lblt = Number(kiBS.output[0]?.total_lblt || 0) * ONE_HUNDRED_MILLION;
    const lstn = Number(kiChart.output1.lstn_stcn);
    const prpr = Number(kiChart.output1.stck_prpr);

    const target = (cras - lblt) / lstn;

    // 1. 헤더와 구분선을 명확히 정의합니다.
    const header = `| 배수(ratio) | 기대 수익률 | 적정 주가(₩) |`;
    const divider = `|:---:|:---:|:---:|`;

    // 2. 각 행을 생성합니다.
    const rows = [1.0, 1.5, 2.0].map(r => {
        const returnPct = ((target / (prpr * r)) - 1) * 100;
        return `| ${r.toFixed(1)} | ${returnPct.toFixed(2)}% | ${Math.round(target).toLocaleString()} |`;
    });

    // 3. 모든 요소를 줄바꿈(\n)으로 합쳐서 반환합니다.
    return [header, divider, ...rows].join("\n");
}

/**
 * 한국 S-RIM 계산 로직
 */
export function calculateKrSRIM(kiBS: any, kiIS: any, kiChart: any) {
    const total_cptl = Number(kiBS?.output[0]?.total_cptl ?? 1) * ONE_HUNDRED_MILLION;
    const thtr_ntin = Number(kiIS?.output[0]?.thtr_ntin ?? 0) * ONE_HUNDRED_MILLION;
    const ROE = (thtr_ntin / total_cptl) * 100;
    const lstn = Number(kiChart.output1.lstn_stcn);
    const prpr = Number(kiChart.output1.stck_prpr);

    // const keList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const keList = [1, 2, 3, 4, 5, 6, 7, 8];
    const rows = keList.map(ke => {
        const value = total_cptl * (1 + (ROE / 100 - ke / 100) / (ke / 100));
        const target = value / lstn;
        const returnPct = (target / prpr - 1) * 100;
        return `| ${ke.toFixed(1)}% | ${returnPct.toFixed(2)}% | ${Math.round(target).toLocaleString()} |`;
    }).join("\n");

    return `| Ke (%) | Exp. Return | Target Price(₩) |\n|---|---|---|\n${rows}`;
}

/**
 * 미국 NCAV 계산 로직
 */
export function calculateUsNcav(finnhub: any, detail: any) {
    const bs = finnhub?.data?.[0]?.report?.bs ?? [];
    const cras = Number(bs.find((i: any) => i.concept.includes("AssetsCurrent"))?.value ?? 0);
    const lblt = Number(bs.find((i: any) => i.concept.includes("Liabilities"))?.value ?? 0);
    const lstn = Number(detail.output.shar || 1);
    const last = Number(detail.output.last || 1);

    const rows = [1.0, 1.5].map(r => {
        const target = (cras - lblt) / lstn;
        const returnPct = ((target / (last * r)) - 1) * 100;
        return `| ${r.toFixed(1)} | ${returnPct.toFixed(2)}% | ${target.toFixed(2)} |`;
    }).join("\n");

    return `| ratio | Exp. Return | Target Price($) |\n|---|---|---|\n${rows}`;
}

/**
 * 숫자를 한국식 단위(조, 억)로 변환합니다.
 */
export function formatKoreanUnit(value: number | string): string {
    const num = Number(value);
    if (isNaN(num) || num === 0) return "0";

    const absoluteValue = Math.abs(num);
    const units = [
        { label: "조", value: 1000000000000 },
        { label: "억", value: 100000000 },
    ];

    if (absoluteValue >= 1000000000000) {
        return (num / 1000000000000).toFixed(2) + "조";
    } else if (absoluteValue >= 100000000) {
        return (num / 100000000).toLocaleString(undefined, { maximumFractionDigits: 0 }) + "억";
    }
    return num.toLocaleString();
}