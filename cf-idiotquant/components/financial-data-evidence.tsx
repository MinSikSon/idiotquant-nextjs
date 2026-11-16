'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { DATA_SOURCES } from '@/lib/data-sources';
import type { KoreaInvestmentBalanceSheet, KoreaInvestmentIncomeStatement } from '@/lib/features/koreaInvestment/koreaInvestmentSlice';
import type { FinnhubFinancialsAsReportedType } from '@/lib/features/finnhubUsMarket/finnhubUsMarketSlice';

const labels: Record<string, string> = {
  endDate: '기준일', startDate: '기간 시작일', filedDate: '공시일',
  fs_div: '연결·별도 구분', rcept_no: '공시 접수번호', reprt_code: '보고서 코드',
  source: '데이터 제공처', periodType: '기간 구분',
  stac_yymm: '결산월', cras: '유동자산', fxas: '고정자산', total_aset: '자산총계',
  flow_lblt: '유동부채', fix_lblt: '고정부채', total_lblt: '부채총계', cpfn: '자본금',
  cfp_surp: '자본잉여금', prfi_surp: '이익잉여금', total_cptl: '자본총계',
  sale_account: '매출액', sale_cost: '매출원가', sale_totl_prfi: '매출총이익',
  depr_cost: '감가상각비', sell_mang: '판매 및 관리비', bsop_prti: '영업이익',
  bsop_non_ernn: '영업외수익', bsop_non_expn: '영업외비용', op_prfi: '경상이익',
  spec_prfi: '특별이익', spec_loss: '특별손실', thtr_ntin: '당기순이익',
};
type Props = {
  market: 'KR' | 'US';
  kiBS: KoreaInvestmentBalanceSheet;
  kiIS: KoreaInvestmentIncomeStatement;
  finnhubData: FinnhubFinancialsAsReportedType;
};
type Row = { path: string; period: string; label: string; value: unknown; unit: string };

function EvidenceRows({ market, kiBS, kiIS, finnhubData }: Props) {
  const [page, setPage] = useState(0);
  const rows = useMemo(() => {
    const result: Row[] = [];
    if (market === 'KR') {
      const datasets = [
        ['kiBS.output', kiBS.state === 'fulfilled' ? kiBS.output : []],
        ['kiIS.output', kiIS.state === 'fulfilled' ? kiIS.output : []],
        ['kiIS.annualOutput', kiIS.state === 'fulfilled' ? kiIS.annualOutput : []],
      ] as const;
      for (const [path, records] of datasets) (records ?? []).forEach((record, index) => {
        for (const [field, value] of Object.entries(record)) result.push({
          path: `${path}[${index}].${field}`, period: record.stac_yymm,
          label: labels[field] ?? field, value, unit: field === 'stac_yymm' ? 'YYYYMM' : ['endDate', 'startDate', 'filedDate', 'fs_div', 'rcept_no', 'reprt_code', 'source', 'periodType'].includes(field) ? '—' : '억 원',
        });
      });
    } else if (finnhubData.state === 'fulfilled') {
      for (const dataset of ['data', 'annualData'] as const) (finnhubData[dataset] ?? []).forEach((record, index) => {
        for (const section of ['bs', 'ic', 'cf'] as const) (record.report?.[section] ?? []).forEach((item, itemIndex) => {
          result.push({ path: `finnhubData.${dataset}[${index}].report.${section}[${itemIndex}].value (${item.concept})`,
            period: `${record.startDate} ~ ${record.endDate} · ${record.form} · ${record.accessNumber}`,
            label: item.label, value: item.value, unit: item.unit });
        });
      });
    }
    return result;
  }, [market, kiBS, kiIS, finnhubData]);
  const lastPage = Math.max(0, Math.ceil(rows.length / 50) - 1);
  const currentPage = Math.min(page, lastPage);
  const source = market === 'KR' ? DATA_SOURCES.dart : DATA_SOURCES.finnhub;
  return <div className="mt-3 space-y-3">
    <p>제공처: <a href={source.url} target="_blank" rel="noreferrer" className="underline">{source.name} ↗</a></p>
    <p>{market === 'KR'
      ? 'OpenDART 단일회사 주요계정 → 백엔드 계정 매핑·억 원 환산 → kiBS.output / kiIS.output · annualOutput. 기존 KIS 형태의 요청 경로를 유지하며 실제 재무 제공처는 OpenDART입니다. NCAV는 유동자산(cras) − 부채총계(total_lblt)를 사용합니다.'
      : 'Financials As Reported → finnhubData.data · annualData. bs는 재무상태표, ic는 손익계산서, cf는 현금흐름표입니다. concept는 공시 항목 식별자입니다.'}</p>
    <p>{market === 'KR' ? '백엔드에서 OpenDART 계정을 매핑하고 억 원으로 환산한 수신 값입니다. OpenDART 원문 금액과는 구분됩니다. fs_div는 연결(CFS)·별도(OFS), rcept_no는 공시 접수번호입니다.' : '화면의 단위 환산·반올림 전 수신 값입니다.'} 기간은 수집 시각이 아닌 재무 기준 기간입니다. 전체 API 응답이 아닌 재무 항목을 제공합니다.</p>
    {rows.length ? <>
      <div role="region" aria-label="재무 원본 값 표" tabIndex={0} className="max-h-96 overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">{source.name} 재무 원본 값과 데이터 경로</caption>
          <thead className="sticky top-0 bg-neutral-100 dark:bg-neutral-800"><tr>
            {['기준 기간·공시', '항목', '원본 경로·필드', '수신 값', '단위'].map(label => <th key={label} scope="col" className="whitespace-nowrap p-3">{label}</th>)}
          </tr></thead>
          <tbody>{rows.slice(currentPage * 50, (currentPage + 1) * 50).map(row => <tr key={row.path} className="border-t border-neutral-200 dark:border-neutral-700">
            <td className="min-w-32 p-3">{row.period}</td><th scope="row" className="min-w-28 p-3 font-normal">{row.label}</th>
            <td className="max-w-sm break-words p-3 font-mono">{row.path}</td>
            <td className="whitespace-pre p-3 font-mono">{row.value === null ? 'null' : row.value === '' ? '""' : String(row.value)}</td><td className="whitespace-nowrap p-3">{row.unit}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="flex items-center gap-3" aria-live="polite">
        <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="min-h-11 px-3 underline disabled:opacity-40">이전</button>
        <span>{currentPage + 1} / {lastPage + 1} · 총 {rows.length}개 항목</span>
        <button type="button" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)} className="min-h-11 px-3 underline disabled:opacity-40">다음</button>
      </div>
    </> : <p role="status">현재 조회에서 받은 재무 원본 값이 없습니다.</p>}
  </div>;
}

export function FinancialDataEvidence(props: Props) {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  if ((session?.user as { role?: string } | undefined)?.role !== 'admin') return null;
  const source = props.market === 'KR' ? DATA_SOURCES.dart : DATA_SOURCES.finnhub;
  return <section className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
    <p>재무 데이터: <a href={source.url} target="_blank" rel="noreferrer" className="underline">{source.name}</a> · <Link href="/data-sources" className="underline">출처 및 이용 조건</Link></p>
    <details className="mt-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700" onToggle={event => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer font-semibold">데이터 출처·원본 값</summary>
      {open && <EvidenceRows {...props} />}
    </details>
  </section>;
}
