import { snapshotStockName } from './presentation';
import type { ResultSnapshot } from './snapshot';

export const SHARE_SERVICE_PAGES = [
  {
    kind: 'screener',
    href: '/screener',
    label: '종목 발굴',
    description: '조건에 맞는 국내·미국 종목 찾기',
  },
  {
    kind: 'compare',
    href: '/compare',
    label: '종목 비교',
    description: '여러 종목의 가격과 지표 비교하기',
  },
  {
    kind: 'analyze',
    href: '/analyze',
    label: '종목 분석',
    description: '원하는 종목의 가치와 재무 살펴보기',
  },
  {
    kind: 'calculator',
    href: '/calculator',
    label: '복리 계산기',
    description: '내 투자 조건으로 결과 계산하기',
  },
] as const;

export function shareServiceTarget(snapshot: ResultSnapshot) {
  const copy = {
    screener: {
      title: '같은 조건으로 종목을 발굴해 보세요',
      label: '이 조건으로 발굴하기',
      description: '공유된 발굴 조건을 적용해 최신 종목을 확인할 수 있습니다.',
    },
    compare: {
      title: '내 관심 종목으로 비교해 보세요',
      label: '종목 비교 시작하기',
      description:
        '원하는 종목과 날짜를 골라 가격과 지표를 비교할 수 있습니다.',
    },
    analyze: {
      title: `${snapshot.title.replace(/ 분석 결과$/, '')} 분석을 이어서 확인하세요`,
      label: '이 종목의 최신 분석 보기',
      description:
        '종목의 최신 시세·재무제표와 가치평가를 원래 분석 화면에서 확인할 수 있습니다.',
    },
    calculator: {
      title: '내 투자 조건으로 직접 계산해 보세요',
      label: '이 조건으로 계산기 열기',
      description:
        '공유된 조건을 불러온 뒤 투자금·기간·수익률을 바꿔 볼 수 있습니다.',
    },
  }[snapshot.kind];
  return { ...copy, href: snapshot.sourcePath };
}

export function sharedStockAnalysisHref(value: string): string {
  const { name, code } = snapshotStockName(value);
  const ticker = (code.split(' · ')[0] || name).trim();
  return ticker ? `/analyze?ticker=${encodeURIComponent(ticker)}` : '/analyze';
}
