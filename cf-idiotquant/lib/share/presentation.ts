import type { BarModel } from '@/app/(search)/search/components/financialBarsData';
import type { YearRow } from '@/app/(calculator)/calculator/calc';
import type { ResultSnapshot, SnapshotTable } from './snapshot';

// 화면용으로 저장한 숫자만 읽는다. 결측값·설명 문장을 숫자 0으로 바꾸지 않는다.
export function snapshotNumber(value: string): number | null {
  const normalized = value.trim().replaceAll('−', '-');
  if (!/^[₩$]?[+-]?\d+(?:,\d{3})*(?:\.\d+)?(?:%|배|주)?$/.test(normalized))
    return null;
  const number = Number(
    normalized.replace(/^[₩$]|[%배주]$/g, '').replaceAll(',', '')
  );
  return Number.isFinite(number) ? number : null;
}

export function snapshotMoney(value: string): number | null {
  const match = value
    .replaceAll(',', '')
    .match(/^([−-]?)(?:(\d+)억(?:\s*(\d+)만)?|(\d+)만)원$/);
  if (!match) return null;
  const amount =
    Number(match[2] ?? 0) * 10000 + Number(match[3] ?? match[4] ?? 0);
  return Number.isFinite(amount) ? amount * (match[1] ? -1 : 1) : null;
}

export function snapshotGrowthRows(snapshot: ResultSnapshot): YearRow[] {
  const table = snapshot.tables.find((table) => table.title === '연도별 명세');
  if (!table) return [];
  const yearAt = table.columns.indexOf('연차');
  const principalAt = table.columns.indexOf('납입 원금');
  const valueAt = table.columns.indexOf('평가금액');
  if ([yearAt, principalAt, valueAt].some((index) => index < 0)) return [];
  const rows: YearRow[] = [];
  const initial = snapshot.tables
    .find((table) => table.title === '계산 조건')
    ?.rows.find((row) => row[0] === '초기 투자금')?.[1];
  const initialValue = initial ? snapshotMoney(initial) : null;
  if (initialValue !== null)
    rows.push({ year: 0, principal: initialValue, value: initialValue });
  for (const row of table.rows) {
    const principal = snapshotMoney(row[principalAt]);
    const value = snapshotMoney(row[valueAt]);
    const year = row[yearAt].match(/^(\d+)년$/);
    if (principal === null || value === null || !year) return [];
    rows.push({ year: Number(year[1]), principal, value });
  }
  return rows;
}

export const ANALYSIS_TABS = [
  { key: 'valuation', label: '전략' },
  { key: 'metrics', label: '지표' },
  { key: 'risk', label: '위험도' },
  { key: 'financials', label: '재무' },
] as const;
export type AnalysisTab = (typeof ANALYSIS_TABS)[number]['key'];
export function analysisTableTab(table: SnapshotTable): AnalysisTab {
  if (table.title.startsWith('상장유지 위험도')) return 'risk';
  if (
    table.title.startsWith('재무상태표') ||
    table.title.startsWith('손익계산서')
  )
    return 'financials';
  if (table.columns.includes('평가 가격')) return 'valuation';
  return 'metrics';
}

export function snapshotStockName(value: string): {
  name: string;
  code: string;
} {
  const match = value.match(/^(.*) \(([^()]+)\)$/);
  return match ? { name: match[1], code: match[2] } : { name: value, code: '' };
}

export function snapshotPriceSeries(
  table: SnapshotTable
): { date: string; close: number | null }[] {
  const dateAt = table.columns.indexOf('거래일');
  const closeAt = table.columns.indexOf('종가');
  if (dateAt < 0 || closeAt < 0) return [];
  return table.rows.map((row) => ({
    date: row[dateAt],
    close: snapshotNumber(row[closeAt]),
  }));
}

export function snapshotFinancialModel(table: SnapshotTable): BarModel {
  return {
    title: table.title.split(' · ')[0],
    periods: table.columns.slice(1),
    stacks: [],
    groups: [
      {
        labelEn: '공유된 재무 항목',
        tone: 'green',
        items: table.rows.map((row) => ({
          label: row[0],
          values: row.slice(1).map(snapshotNumber),
          tone: /부채|원가|판관비/.test(row[0])
            ? 'rose'
            : /이익/.test(row[0])
              ? 'violet'
              : 'green',
          costLike: /부채|원가|판관비/.test(row[0]),
          neutral: /활동/.test(row[0]),
        })),
      },
    ],
  };
}
