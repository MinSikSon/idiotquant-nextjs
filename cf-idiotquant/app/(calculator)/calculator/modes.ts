/**
 * 계산기 복잡도 단계.
 *
 * 열다섯 개 입력과 다섯 개 토글을 한 화면에 다 펴놓으면, 처음 온 사람은 무엇을
 * 만져야 하는지부터 막힌다. 그렇다고 고급 항목을 지울 수는 없다 — 쓰는 사람이 있다.
 *
 * 그래서 "무엇을 보여주는가" 와 "무엇으로 계산하는가" 를 같은 단계가 정한다.
 * 안 보이는 항목은 계산에서도 빠진다(maskByMode). 화면에 없는 설정이 결과를 바꾸는
 * 상황 — 왜 이 숫자가 나오는지 알 수 없는 상황 — 을 만들지 않기 위해서다.
 *
 * 입력한 값 자체는 지우지 않는다. 전문으로 돌아오면 켜뒀던 설정이 그대로 있다.
 */

export type CalcMode = "simple" | "standard" | "expert";

export const CALC_MODES: { key: CalcMode; label: string; hint: string }[] = [
    { key: "simple", label: "간단", hint: "지금 모은 돈과 매달 넣을 돈으로 언제까지 버티는지" },
    { key: "standard", label: "표준", hint: "연봉 상승과 물가까지 넣어 현실에 가깝게" },
    { key: "expert", label: "전문", hint: "건보료·국민연금·고율 과세까지 전부" },
];

export const isCalcMode = (v: unknown): v is CalcMode =>
    v === "simple" || v === "standard" || v === "expert";

/** 이 단계에서 화면에 보이는가 = 이 단계의 계산에 들어가는가. */
export const showsGrowthRates = (mode: CalcMode) => mode !== "simple";
export const showsBasicToggles = (mode: CalcMode) => mode !== "simple";
export const showsAdvancedToggles = (mode: CalcMode) => mode === "expert";
/** 표는 서른 줄이 넘는다 — 처음 보는 사람에게는 답이 아니라 벽이다. */
export const showsTable = (mode: CalcMode) => mode !== "simple";
/** 패널 순서 바꾸기는 화면을 이미 다 아는 사람의 기능이다. */
export const showsLayoutTools = (mode: CalcMode) => mode === "expert";

interface MaskableInputs {
    contributionGrowthRate: number;
    expenseGrowthRate: number;
    taxRate: number;
    applyTax: boolean;
    realValueMode: boolean;
    applyIsaIsaGold: boolean;
    applyInsurancePremium: boolean;
    applyNationalPension: boolean;
}

/** 간단 단계가 말없이 적용하는 값. 화면에도 이 문장으로 적어둔다. */
export const SIMPLE_TAX_RATE = 15.4;

/**
 * 단계에 맞춰 값을 덮어쓴다. 원본은 건드리지 않는다 —
 * 전문으로 돌아가면 켜뒀던 설정이 그대로 살아 있어야 한다.
 */
export function maskByMode<T extends MaskableInputs>(inputs: T, mode: CalcMode): T {
    if (mode === "expert") return inputs;

    const masked: T = {
        ...inputs,
        // 표준까지는 고율 과세·건보료·국민연금을 쓰지 않는다. 이 셋은 켜고 끄는 것만으로
        // 결과가 크게 흔들려서, 보이지 않는 채로 켜져 있으면 안 된다.
        applyIsaIsaGold: false,
        applyInsurancePremium: false,
        applyNationalPension: false,
        taxRate: SIMPLE_TAX_RATE,
    };

    if (mode === "simple") {
        // 증액률·상승률은 0. 세금은 켜둔다 — 끄면 결과가 실제보다 나아 보인다.
        masked.contributionGrowthRate = 0;
        masked.expenseGrowthRate = 0;
        masked.applyTax = true;
        masked.realValueMode = false;
    }

    return masked;
}

/** 이 단계가 말없이 정해둔 것들. 결과 아래에 그대로 적는다. */
export function assumptionsOf(mode: CalcMode): string[] {
    if (mode === "expert") return [];

    const common = ["건보료·국민연금·고율 과세 미반영"];
    if (mode === "standard") return common;

    return [
        `이자소득세 ${SIMPLE_TAX_RATE}% 적용`,
        "저축 증액률·지출 상승률 0%",
        "물가 미반영 (명목 금액)",
        ...common,
    ];
}
