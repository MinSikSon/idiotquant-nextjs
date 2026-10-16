import { buildKrBars, buildUsBars } from '@/app/(search)/search/components/financialBarsData';
import { technicalSummary, type PriceBar } from '@/lib/research/technical';
import { valuationModels } from '@/lib/utils/valuationModels';
import { financialFreshness, analysisFinancialPeriods } from '@/lib/utils/financialFreshness';
import { shareNumber } from './builders';
import type { ResultSnapshot } from './snapshot';

type AnalysisValues = { per: number; pbr: number; eps: number; bps: number; curPrice: number };
export function analysisSnapshot({ title, sourcePath, market, values, ncav, roe, data, bars, includeDetails, verdict }: {
  title: string; sourcePath: string; market: 'KR' | 'US'; values: AnalysisValues;
  ncav: number | null; roe: number | null; data: any; bars: PriceBar[]; includeDetails: boolean;
  verdict: { lead: string; checks: { label: string; criterion: string; value: string; ok: boolean }[] } | null;
}): ResultSnapshot {
  const currency = market === 'US' ? '$' : '₩';
  const snapshot: ResultSnapshot = {
    version: 1, kind: 'analyze', title: `${title} 분석 결과`, sourcePath, createdAt: new Date().toISOString(),
    summary: [{ label: '시장', value: market === 'US' ? '미국' : '국내' }, { label: '현재가', value: shareNumber(values.curPrice, '', currency) }],
    tables: [{ title: '핵심 지표', columns: ['지표', '값'], rows: [
      ['PER', shareNumber(values.per, '배')], ['PBR', shareNumber(values.pbr, '배')],
      ['ROE', shareNumber(roe, '%')], ['NCAV 배수', shareNumber(ncav, '배')],
      ['EPS', shareNumber(values.eps, '', currency)], ['BPS', shareNumber(values.bps, '', currency)],
    ] }],
    notes: ['공유자가 조회한 시점의 결과이며 실시간 데이터가 아닙니다.', '평가 모델의 가정에 따른 참고값이며 투자 수익을 보장하지 않습니다.'],
  };
  const freshness = financialFreshness(analysisFinancialPeriods(data, market));
  snapshot.notes.push(`재무정보 기준: ${freshness.periods || '미확인'}. ${freshness.message || freshness.label}`);
  if (verdict) {
    snapshot.notes.push(verdict.lead);
    snapshot.tables.push({ title: '저평가 기준 확인', columns: ['지표', '기준', '조회값', '충족 여부'], rows: verdict.checks.map(check => [check.label, check.criterion, check.value, check.ok ? '충족' : '미충족']) });
  }
  if (bars.length) {
    snapshot.tables.push({ title: '조회된 주가 추이', columns: ['거래일', '종가', '거래량'], rows: bars.map(bar => [bar.date, shareNumber(bar.close, '', currency), shareNumber(bar.volume)]) });
    const tech = technicalSummary(bars);
    snapshot.tables.push({ title: '모멘텀 · 기술적 지표', columns: ['지표', '값'], rows: [
      ['최근 20개 시세 기준 등락률', shareNumber(tech.momentum20, '%')], ['최근 60개 시세 기준 등락률', shareNumber(tech.momentum60, '%')],
      ['RSI · 14개 시세 기준', shareNumber(tech.rsi14)], ['최근 20개 종가 평균', shareNumber(tech.sma20, '', currency)],
      ['최근 60개 종가 평균', shareNumber(tech.sma60, '', currency)], ['직전 20개 시세 평균 대비 거래량', shareNumber(tech.volumeRatio, '배')],
    ] });
  }
  if (includeDetails) {
    for (const { result } of valuationModels(data, market === 'US')) {
      snapshot.tables.push({ title: result.title, columns: ['가정', '평가 가격', '기준가 대비'], rows: result.rows.map(row => [String(row.multiplier), shareNumber(row.targetPrice, '', currency), shareNumber(row.returnPct, '%')]) });
      snapshot.notes.push(`${result.title}: ${result.footerNotice}`);
    }
    const finance = market === 'US' ? buildUsBars(data.finnhubData?.data ?? []) : buildKrBars(data.kiBS, data.kiIS);
    for (const model of [finance.bs, finance.is]) {
      if (!model?.periods.length) continue;
      snapshot.tables.push({
        title: `${model.title} · ${market === 'US' ? 'USD' : '억 원'}`,
        columns: ['계정과목', ...model.periods],
        rows: model.groups.flatMap(group => group.items.map(item => [item.label, ...item.values.map(value => shareNumber(value))])),
      });
    }
  }
  return snapshot;
}
