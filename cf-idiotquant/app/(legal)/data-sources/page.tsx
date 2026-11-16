import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { DATA_SOURCES } from '@/lib/data-sources';

export const metadata: Metadata = { title: '데이터 출처', alternates: { canonical: '/data-sources' }, robots: { index: false, follow: false } };

export default async function DataSourcesPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if ((session.user as { role?: string } | undefined)?.role !== 'admin') redirect('/');
  return <div className="space-y-6 text-sm leading-relaxed">
    <h1 className="text-2xl font-bold">데이터 출처</h1>
    <p>분석 화면의 ‘데이터 출처·원본 값’에서 제공처와 재무 항목을 대조할 수 있습니다. 표의 값은 서비스가 수신한 재무 데이터입니다. 국내 재무는 백엔드에서 OpenDART 주요계정을 매핑하고 억 원으로 환산한 값으로, 공시 원문 파일·원문 금액과는 구분됩니다.</p>
    {Object.entries(DATA_SOURCES).map(([id, source]) => <section key={id} id={id} className="space-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
      <h2 className="font-semibold"><a href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">{source.name} ↗</a></h2>
      <p>{source.usage}</p>
      <p className="text-neutral-600 dark:text-neutral-400">{source.terms}</p>
    </section>)}
    <section className="space-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
      <h2 className="font-semibold">가공 지표와 원본 값</h2>
      <p>NCAV·적정가치·등급은 제공된 재무 및 시세를 이용해 서비스가 계산한 값입니다. 재무 표의 단위 환산, 기간 정렬, 분기·연간 선택에 따라 원본 값과 표시 형태가 다를 수 있습니다. 데이터 기준일은 각 표의 결산월 또는 공시 기간을 확인해 주세요.</p>
      <p>한국투자증권의 일별 주가는 원본 표에서 제외합니다. 과거 시가총액 보완값은 비교 화면에 표시하며, 보관하지 않은 외부 API 원본을 원본 데이터로 제공하지 않습니다.</p>
    </section>
    <p className="text-xs text-neutral-500">이용 조건 확인일: 2026-11-16. 출처 표시는 상업적 이용·재배포 허가를 대신하지 않습니다.</p>
  </div>;
}
