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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clientFilter?: (item: Record<string, any>) => boolean;
}

export const STRATEGY_PRESETS_CLIENT: StrategyPreset[] = [
    { id: 'ncav',           label: 'NCAV',     hint: '순유동자산 > 시가총액 — 그레이엄 청산가치 이하',          plain: '빚 다 갚고 남는 현금성 자산이 시가총액보다 크면 해당',                     clientFilter: i => safeNum(i.ncav_ratio) >= 1.0 },
    { id: 'low_pbr',        label: '저PBR',    hint: 'PBR < 0.5 — 순자산 절반 이하 가격',                       plain: '장부가의 절반도 안 되는 가격에 살 수 있는 종목',                           clientFilter: i => safeNum(i.pbr) > 0 && safeNum(i.pbr) < 0.5 },
    { id: 'low_per',        label: '저PER',    hint: 'PER < 10 + 흑자(EPS > 0)',                                 plain: '이익 대비 주가가 10배 미만 — 흑자 기업 중 가장 싼 그룹',                   clientFilter: i => safeNum(i.eps) > 0 && safeNum(i.per) > 0 && safeNum(i.per) < 10 },
    { id: 's_rim',          label: 'S-RIM',    hint: 'ROE > 8% & PBR < 1.0 — 초과이익 기업 장부가 이하',        plain: '돈 잘 버는 회사를 장부가(청산가치) 이하로 살 수 있는 종목',                clientFilter: i => { const roe = safeNum(i.bps) > 0 ? safeNum(i.eps) / safeNum(i.bps) * 100 : 0; return roe > 8 && safeNum(i.pbr) > 0 && safeNum(i.pbr) < 1.0; } },
    { id: 'graham_number',  label: '그레이엄', hint: 'PER × PBR < 22.5 — 그레이엄 복합 안전마진',               plain: 'PER과 PBR 둘 다 낮아야 통과 — 워런 버핏 스승의 기준',                     clientFilter: i => safeNum(i.eps) > 0 && safeNum(i.bps) > 0 && safeNum(i.per) > 0 && safeNum(i.pbr) > 0 && safeNum(i.per) * safeNum(i.pbr) < 22.5 },
    { id: 'magic_formula',  label: '마법공식', hint: 'PER < 15 & ROE > 10% — Greenblatt 변형',                  plain: '수익성 좋고 주가도 싼 종목을 동시에 고르는 전략',                           clientFilter: i => safeNum(i.eps) > 0 && safeNum(i.per) > 0 && safeNum(i.per) < 15 && safeNum(i.bps) > 0 && safeNum(i.eps) / safeNum(i.bps) * 100 > 10 },
    { id: 'quality_value',  label: '퀄리티',   hint: 'ROE > 15% & PBR < 2.0 — 버핏 스타일',                     plain: 'ROE 15% 이상 우량 기업을 PBR 2배 이하에 담는 전략',                       clientFilter: i => safeNum(i.eps) > 0 && safeNum(i.bps) > 0 && safeNum(i.eps) / safeNum(i.bps) * 100 > 15 && safeNum(i.pbr) > 0 && safeNum(i.pbr) < 2.0 },
    { id: 'near_ncav',      label: 'NCAV근접', hint: 'NCAV 0.7~1.0 — 청산가치 근접 관찰',                       plain: '청산가치의 70~100% 구간 — NCAV 진입 전 미리 관찰할 후보',                  clientFilter: i => safeNum(i.ncav_ratio) >= 0.7 && safeNum(i.ncav_ratio) < 1.0 },
    { id: 'balanced_value', label: '균형가치', hint: 'PER 5~15 & PBR < 1.5 & EPS > 0',                          plain: 'PER·PBR이 모두 적정 범위 — 극단 없이 균형 잡힌 저평가 종목',              clientFilter: i => safeNum(i.eps) > 0 && safeNum(i.per) > 5 && safeNum(i.per) < 15 && safeNum(i.pbr) > 0 && safeNum(i.pbr) < 1.5 },
];
