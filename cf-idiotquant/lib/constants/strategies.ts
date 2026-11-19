import { safeNum } from '@/lib/utils/numbers';
import { profitableScanStock, scanRoePercent } from '@/lib/utils/scanFinancials';

export const STRATEGY_LABEL: Record<string, string> = {
    ncav: 'NCAV', low_pbr: '저PBR', low_per: '저PER', s_rim: 'S-RIM',
    graham_number: '그레이엄', magic_formula: '마법공식', quality_value: '퀄리티',
    near_ncav: 'NCAV근접', balanced_value: '균형가치',
};

export const STRATEGY_BADGE: Record<string, string> = {
    ncav:           'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    low_pbr:        'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400',
    low_per:        'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400',
    s_rim:          'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400',
    graham_number:  'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400',
    magic_formula:  'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
    quality_value:  'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
    near_ncav:      'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400',
    balanced_value: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400',
};

// 활성 전략 칩 = 전략별 단색. 요약 그래프의 막대 색도 여기서 가져온다(새 색 도입 없이).
export const STRATEGY_ACTIVE_CLS: Record<string, string> = {
    all:            "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-sm",
    ncav:           "bg-emerald-600 border-emerald-600 text-white shadow-sm",
    low_pbr:        "bg-sky-600 border-sky-600 text-white shadow-sm",
    low_per:        "bg-orange-500 border-orange-500 text-white shadow-sm",
    s_rim:          "bg-violet-600 border-violet-600 text-white shadow-sm",
    graham_number:  "bg-teal-600 border-teal-600 text-white shadow-sm",
    magic_formula:  "bg-rose-600 border-rose-600 text-white shadow-sm",
    quality_value:  "bg-amber-500 border-amber-500 text-white shadow-sm",
    near_ncav:      "bg-indigo-600 border-indigo-600 text-white shadow-sm",
    balanced_value: "bg-cyan-600 border-cyan-600 text-white shadow-sm",
};

// 위 Tailwind 클래스와 같은 색을 hex로 — canvas(SectorSprite)는 클래스를 못 읽는다
export const STRATEGY_HEX: Record<string, string> = {
    ncav: '#059669', low_pbr: '#0284c7', low_per: '#f97316', s_rim: '#7c3aed',
    graham_number: '#0d9488', magic_formula: '#e11d48', quality_value: '#f59e0b',
    near_ncav: '#4f46e5', balanced_value: '#0891b2',
};

export const MKTCAP_PRESETS: { label: string; value: number }[] = [
    { label: '전체', value: 0 },
    { label: '500억+', value: 500 },
    { label: '1000억+', value: 1_000 },
    { label: '5000억+', value: 5_000 },
];

export interface StrategyPreset {
    id: string;
    label: string;
    hint: string;
    plain: string;
    formula: string;   // 판정 기준 수식만 — 전략 기준 배너에서 굵게 단독 표기
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clientFilter?: (item: Record<string, any>) => boolean;
}

export const STRATEGY_PRESETS_CLIENT: StrategyPreset[] = [
    { id: 'ncav',           label: 'NCAV',     formula: 'NCAV ≥ 시가총액',           plain: '유동자산에서 총부채를 뺀 값이 시가총액 이상인 기업',  hint: '유동자산 − 총부채 ≥ 시가총액',          clientFilter: i => safeNum(i.ncav_ratio) >= 1.0 },
    { id: 'low_pbr',        label: '저PBR',    formula: 'PBR < 0.5',                       plain: '주가가 주당순자산의 절반 미만인 기업',     hint: 'PBR 0배 초과, 0.5배 미만',                       clientFilter: i => safeNum(i.pbr) > 0 && safeNum(i.pbr) < 0.5 },
    { id: 'low_per',        label: '저PER',    formula: 'PER < 10 & EPS > 0',              plain: '주가가 주당순이익의 10배 미만인 흑자 기업',           hint: 'PER < 10 + 흑자(EPS > 0)',                                 clientFilter: i => profitableScanStock(i) && safeNum(i.per) > 0 && safeNum(i.per) < 10 },
    { id: 's_rim',          label: 'S-RIM',    formula: 'ROE > 8% & PBR < 1.0',            plain: 'ROE가 8%를 넘고 주가가 주당순자산 미만인 기업',         hint: 'ROE > 8% & PBR < 1.0 — 초과이익 기업 장부가 이하',        clientFilter: i => scanRoePercent(i) > 8 && safeNum(i.pbr) > 0 && safeNum(i.pbr) < 1.0 },
    { id: 'graham_number',  label: '그레이엄', formula: 'PER × PBR < 22.5',                plain: '흑자이고 주당순자산이 양수이며, PER과 PBR을 곱한 값이 22.5 미만인 기업',         hint: 'PER × PBR < 22.5 · 흑자 · BPS 양수',               clientFilter: i => profitableScanStock(i) && safeNum(i.bps) > 0 && safeNum(i.per) > 0 && safeNum(i.pbr) > 0 && safeNum(i.per) * safeNum(i.pbr) < 22.5 },
    { id: 'magic_formula',  label: '마법공식', formula: 'PER < 15 & ROE > 10%',            plain: 'PER이 15배 미만이고 ROE가 10%를 넘는 흑자 기업',                 hint: 'PER < 15 & ROE > 10% — Greenblatt 변형',                  clientFilter: i => profitableScanStock(i) && safeNum(i.per) > 0 && safeNum(i.per) < 15 && scanRoePercent(i) > 10 },
    { id: 'quality_value',  label: '퀄리티',   formula: 'ROE > 15% & PBR < 2.0',           plain: 'ROE가 15%를 넘고 PBR이 2배 미만인 흑자 기업',             hint: 'ROE > 15% · PBR < 2.0 · 흑자',                     clientFilter: i => profitableScanStock(i) && scanRoePercent(i) > 15 && safeNum(i.pbr) > 0 && safeNum(i.pbr) < 2.0 },
    { id: 'near_ncav',      label: 'NCAV근접', formula: '0.7 ≤ NCAV ÷ 시가총액 < 1.0',                  plain: 'NCAV가 시가총액의 70% 이상, 100% 미만인 기업',          hint: 'NCAV ÷ 시가총액이 0.7 이상, 1.0 미만',                       clientFilter: i => safeNum(i.ncav_ratio) >= 0.7 && safeNum(i.ncav_ratio) < 1.0 },
    { id: 'balanced_value', label: '균형가치', formula: '5 < PER < 15 · PBR < 1.5 · EPS > 0',  plain: 'PER이 5배 초과 15배 미만이고 PBR이 1.5배 미만인 흑자 기업',           hint: '5 < PER < 15 · PBR < 1.5 · 흑자',                          clientFilter: i => profitableScanStock(i) && safeNum(i.per) > 5 && safeNum(i.per) < 15 && safeNum(i.pbr) > 0 && safeNum(i.pbr) < 1.5 },
];
