import { basisOf, pct, serialize, won, type CalcInputs, type CalcResult, type Detail } from '@/app/(calculator)/calculator/calc';
import type { ResultSnapshot } from './snapshot';

export function calculatorSnapshot(inputs: CalcInputs, detail: Detail, result: CalcResult): ResultSnapshot {
  const snapshot: ResultSnapshot = {
    version: 1, kind: 'calculator', title: '복리 수익률 계산 결과', createdAt: new Date().toISOString(),
    sourcePath: `/calculator?${serialize(inputs, detail)}`,
    summary: [{ label: '만기 평가금액', value: won(result.final) }, { label: '누적 수익률', value: pct(result.cumret) }, { label: '투자 기간', value: `${inputs.years}년` }],
    tables: [{ title: '계산 결과', columns: ['항목', '값'], rows: [
      ['총 납입 원금', won(result.principal)], ['총 투자수익', won(result.profit)],
      ['연평균 (CAGR)', pct(result.cagr)], ['물가 반영 구매력', won(result.real)],
    ] }, { title: '계산 조건', columns: ['항목', '값'], rows: [
      ['초기 투자금', won(inputs.initial)], ['매월 적립금', won(inputs.monthly)],
      ['수익률', inputs.rateMode === 'range' ? `${inputs.rateMin}% ~ ${inputs.rateMax}%` : `${inputs.rate}%`],
      ['계산 기준', basisOf(inputs)], ['물가상승률', `${inputs.inflation}%`],
    ] }, { title: '연도별 명세', columns: ['연차', '적용 수익률', '납입 원금', '투자수익', '평가금액', '누적 수익률'],
      rows: result.rows.filter(row => row.year > 0).map(row => [
        `${row.year}년`, pct(row.rate ?? inputs.rate), won(row.principal), won(row.value - row.principal), won(row.value),
        pct(row.principal > 0 ? (row.value / row.principal - 1) * 100 : 0),
      ]),
    }],
    notes: ['입력한 가정으로 계산한 결과이며 실제 투자 수익을 보장하지 않습니다.', '공유 시점의 계산값을 담고 있으며 결과를 다시 계산하지 않습니다.'],
  };
  if (detail === 'detailed') {
    snapshot.tables.push({ title: '가치 · 통화량 비교', columns: ['기준', '연간 가정', '비교 자산의 만기 가치'], rows: [
      ['원화 구매력', `${inputs.inflation}%`, won(result.valueComparison.krw)],
      ['달러 가치', `환율 ${inputs.usdChange}%`, won(result.valueComparison.usd)],
      ['금 가치', `금값 ${inputs.goldChange}% · 환율 ${inputs.usdChange}%`, won(result.valueComparison.gold)],
      ['원화 M2', `${inputs.krwM2Growth}%`, won(result.moneySupplyComparison.krw)],
      ['달러 M2', `${inputs.usdM2Growth}% · 환율 ${inputs.usdChange}%`, won(result.moneySupplyComparison.usd)],
    ] });
  }
  return snapshot;
}
