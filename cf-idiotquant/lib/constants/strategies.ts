import { safeNum } from '@/lib/utils/numbers';

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
    { id: 'ncav',           label: 'NCAV',     formula: '순유동자산 > 시가총액',           plain: '지금 회사를 팔아 빚을 다 갚아도 주가보다 더 남는 회사',  hint: '순유동자산 > 시가총액 — 그레이엄 청산가치 이하',          clientFilter: i => safeNum(i.ncav_ratio) >= 1.0 },
    { id: 'low_pbr',        label: '저PBR',    formula: 'PBR < 0.5',                       plain: '가진 자산 가치의 절반도 안 되는 값에 거래되는 회사',     hint: 'PBR < 0.5 — 순자산 절반 이하 가격',                       clientFilter: i => safeNum(i.pbr) > 0 && safeNum(i.pbr) < 0.5 },
    { id: 'low_per',        label: '저PER',    formula: 'PER < 10 & EPS > 0',              plain: '버는 이익에 비해 주가가 유난히 싼 흑자 회사',           hint: 'PER < 10 + 흑자(EPS > 0)',                                 clientFilter: i => safeNum(i.eps) > 0 && safeNum(i.per) > 0 && safeNum(i.per) < 10 },
    { id: 's_rim',          label: 'S-RIM',    formula: 'ROE > 8% & PBR < 1.0',            plain: '이익을 꾸준히 잘 내는데도 장부가치보다 싼 회사',         hint: 'ROE > 8% & PBR < 1.0 — 초과이익 기업 장부가 이하',        clientFilter: i => { const roe = safeNum(i.bps) > 0 ? safeNum(i.eps) / safeNum(i.bps) * 100 : 0; return roe > 8 && safeNum(i.pbr) > 0 && safeNum(i.pbr) < 1.0; } },
    { id: 'graham_number',  label: '그레이엄', formula: 'PER × PBR < 22.5',                plain: '이익도 자산도 모두 싸서 안전마진이 두툼한 회사',         hint: 'PER × PBR < 22.5 — 그레이엄 복합 안전마진',               clientFilter: i => safeNum(i.eps) > 0 && safeNum(i.bps) > 0 && safeNum(i.per) > 0 && safeNum(i.pbr) > 0 && safeNum(i.per) * safeNum(i.pbr) < 22.5 },
    { id: 'magic_formula',  label: '마법공식', formula: 'PER < 15 & ROE > 10%',            plain: '싸면서 돈도 잘 버는, 가성비 좋은 회사',                 hint: 'PER < 15 & ROE > 10% — Greenblatt 변형',                  clientFilter: i => safeNum(i.eps) > 0 && safeNum(i.per) > 0 && safeNum(i.per) < 15 && safeNum(i.bps) > 0 && safeNum(i.eps) / safeNum(i.bps) * 100 > 10 },
    { id: 'quality_value',  label: '퀄리티',   formula: 'ROE > 15% & PBR < 2.0',           plain: '돈을 아주 잘 버는 우량 기업을 적당한 값에',             hint: 'ROE > 15% & PBR < 2.0 — 버핏 스타일',                     clientFilter: i => safeNum(i.eps) > 0 && safeNum(i.bps) > 0 && safeNum(i.eps) / safeNum(i.bps) * 100 > 15 && safeNum(i.pbr) > 0 && safeNum(i.pbr) < 2.0 },
    { id: 'near_ncav',      label: 'NCAV근접', formula: 'NCAV 0.7 ~ 1.0',                  plain: '청산가치에 거의 닿은, 곧 NCAV가 될 관찰 후보',          hint: 'NCAV 0.7~1.0 — 청산가치 근접 관찰',                       clientFilter: i => safeNum(i.ncav_ratio) >= 0.7 && safeNum(i.ncav_ratio) < 1.0 },
    { id: 'balanced_value', label: '균형가치', formula: 'PER 5~15 & PBR < 1.5 & EPS > 0',  plain: '이익·자산·가격이 고루 균형 잡힌 무난한 회사',           hint: 'PER 5~15 & PBR < 1.5 & EPS > 0',                          clientFilter: i => safeNum(i.eps) > 0 && safeNum(i.per) > 5 && safeNum(i.per) < 15 && safeNum(i.pbr) > 0 && safeNum(i.pbr) < 1.5 },
];
