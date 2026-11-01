import { comparisonPrices } from '@/lib/features/compare/pricing';
import type { ComparisonStock } from '@/lib/features/compare/compareSlice';
import { calculatePriceReturns, summarizeReturns } from '@/app/(compare)/compare/priceReturns';
import { scanRoePercent } from '@/lib/utils/scanFinancials';
import { collectionFinancialFreshness, financialSourceLabel, scanCollectionDate, scanFinancialPeriods } from '@/lib/utils/financialFreshness';
import { STRATEGY_LABEL } from '@/lib/constants/strategies';
import type { ResultSnapshot, SnapshotTable } from './snapshot';

export const shareNumber = (value: unknown, suffix = '', prefix = '') => {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  return Number.isFinite(number) ? `${prefix}${number.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${suffix}` : '—';
};
const base = (kind: ResultSnapshot['kind'], title: string, sourcePath: string): ResultSnapshot => ({
  version: 1, kind, title, sourcePath, createdAt: new Date().toISOString(), summary: [], tables: [],
  notes: ['공유자가 조회한 시점의 결과이며 실시간 데이터가 아닙니다.', '투자 참고 정보이며 수익을 보장하지 않습니다.'],
});

export function screenerSnapshot(items: Record<string, any>[], sourcePath: string, date: string | null, country: 'KR' | 'US', conditions: string[]): ResultSnapshot {
  const snapshot = base('screener', '종목 발굴 결과', sourcePath);
  snapshot.summary = [{ label: '공유 종목', value: `${items.length}개` }, { label: '시장', value: country === 'US' ? '미국' : '국내' }, { label: '데이터 기준일', value: date || '미제공' }];
  snapshot.tables = [{
    title: '발굴 종목', columns: ['종목', '현재가', 'PER', 'PBR', 'ROE', 'NCAV 배수', country === 'US' ? '시가총액 (USD)' : '시가총액 (억 원)', '전략', '재무 기준일', '재무정보 상태', '재무 출처', '수집일', '수집일·재무 기준일 비교'],
    rows: items.map(item => {
      const freshness = collectionFinancialFreshness(scanFinancialPeriods(item), scanCollectionDate(item), new Date(snapshot.createdAt));
      return [
      `${item.name} (${item.ticker})`, shareNumber(item.last_price, '', country === 'US' ? '$' : '₩'),
      shareNumber(item.per, '배'), shareNumber(item.pbr, '배'), shareNumber(scanRoePercent(item), '%'),
      shareNumber(item.ncav_ratio, '배'), shareNumber(item.market_cap),
      (Array.isArray(item.strategies) ? item.strategies.map((id: string) => STRATEGY_LABEL[id] ?? id).join(' · ') : '') || '—',
      freshness.periods || '미확인', freshness.label, financialSourceLabel(item.financial_source) || '미확인', freshness.collectionDate || '미확인', freshness.message,
      ];
    }),
  }];
  if (conditions.length) snapshot.notes.unshift(`적용 조건: ${conditions.join(' · ')}`);
  snapshot.notes.push('공유자의 결과 목록 순서를 유지합니다. 전체 시장의 종목 수가 아닌 공유에 포함된 종목 수입니다.');
  return snapshot;
}

export function compareSnapshot(stocks: ComparisonStock[], dates: string[]): ResultSnapshot {
  const snapshot = base('compare', '종목 비교 결과', '/compare');
  snapshot.summary = [{ label: '비교 종목', value: `${stocks.length}개` }, { label: '비교 날짜', value: `${dates.length}개` }];
  const pricesByStock = new Map(stocks.map(stock => [stock.id, comparisonPrices(stock, dates)]));
  const returns = calculatePriceReturns(stocks.flatMap(stock => dates.map(date => ({
    id: `${stock.id}:${date}`, ticker: stock.ticker, market: stock.market,
    price: pricesByStock.get(stock.id)?.prices[date], priceDate: stock.prices[date]?.priceDate,
  }))));
  snapshot.tables = [{
    title: '날짜별 비교 가격과 현재 지표',
    columns: ['종목', ...dates.map(date => `${date} 가격`), 'PER', 'PBR', 'EPS', 'BPS', 'ROE', '현재 상장주식 수'],
    rows: stocks.map(stock => [
      `${stock.name} (${stock.ticker} · ${stock.market})`,
      ...dates.map(date => {
        const price = stock.prices[date];
        if (price?.loading) return '조회 중';
        if (price?.price == null) return price?.error || '가격 없음';
        const comparison = pricesByStock.get(stock.id)!;
        const change = returns.get(`${stock.id}:${date}`);
        return `${shareNumber(comparison.prices[date], '', stock.currency)} · ${price.priceDate ?? date} ${comparison.closing ? '종가 기준' : '시총 환산가'}${change ? ` · ${change.baseline ? '변화율 기준일' : shareNumber(change.percent, '%')}` : ''}`;
      }),
      shareNumber(stock.per, '배'), shareNumber(stock.pbr, '배'), shareNumber(stock.eps, '', stock.currency),
      shareNumber(stock.bps, '', stock.currency), shareNumber(stock.roe, '%'), shareNumber(stock.currentShares, '주'),
    ]),
  }];
  const stats: SnapshotTable = { title: '날짜별 주가 변화율 통계', columns: ['날짜', '평균', '중앙값', '상승 종목 / 집계 종목'], rows: [] };
  for (const date of dates) {
    const values = stocks.flatMap(stock => {
      const result = returns.get(`${stock.id}:${date}`);
      return result && stock.prices[date]?.priceDate !== result.baselineDate ? [result.percent] : [];
    });
    const summary = summarizeReturns(values);
    if (summary) stats.rows.push([date, shareNumber(summary.average, '%'), shareNumber(summary.median, '%'), `${summary.positiveCount} / ${summary.count}`]);
  }
  if (stats.rows.length) snapshot.tables.push(stats);
  snapshot.notes.push('환산가 = 해당 거래일 시가총액 ÷ 조회 당시 현재 상장주식 수. 시총이 없으면 같은 시점에 저장된 가격 × 당시 상장주식 수로 역산합니다. 시총은 저장 시점 기준으로 종가와 차이가 있을 수 있으며 분할·병합 외 증자·감자도 반영합니다. 환산가가 없는 날짜가 있으면 해당 종목의 모든 날짜를 제공 종가 기준으로 비교하고 변화율 집계에 포함합니다. 종가 기준 비교에는 주식 수 변화가 반영되지 않을 수 있습니다. 재무지표는 조회 당시 기준이며 배당·비용은 포함하지 않습니다.');
  return snapshot;
}
