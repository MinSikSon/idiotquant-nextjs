import assert from 'node:assert/strict';
import test from 'node:test';
import {
  shareServiceTarget,
  sharedStockAnalysisHref,
  SHARE_SERVICE_PAGES,
} from '../lib/share/navigation.ts';
import type { ResultSnapshot } from '../lib/share/snapshot.ts';

const snapshot: ResultSnapshot = {
  version: 1,
  kind: 'analyze',
  title: '삼성전자 분석 결과',
  createdAt: '2026-10-16T00:00:00Z',
  sourcePath: '/analyze?ticker=%EC%82%BC%EC%84%B1%EC%A0%84%EC%9E%90',
  summary: [],
  tables: [],
  notes: [],
};

test('공유 화면의 원래 서비스 버튼은 종목과 계산기·발굴의 조건을 그대로 전달한다', () => {
  for (const [kind, sourcePath] of [
    ['analyze', snapshot.sourcePath],
    ['screener', '/screener?per=20&country=US'],
    ['calculator', '/calculator?years=20&rate=7'],
    ['compare', '/compare'],
  ] as const) {
    const target = shareServiceTarget({ ...snapshot, kind, sourcePath });
    assert.equal(target.href, sourcePath);
    assert.ok(target.label.length > 0);
  }
  assert.equal(shareServiceTarget(snapshot).label, '이 종목의 최신 분석 보기');
  assert.ok(shareServiceTarget(snapshot).title.includes('삼성전자'));
});

test('종목 카드·비교표의 링크는 국내 코드와 미국 티커를 정확하게 분석 페이지로 넘긴다', () => {
  assert.equal(
    sharedStockAnalysisHref('삼성전자 (005930)'),
    '/analyze?ticker=005930'
  );
  assert.equal(
    sharedStockAnalysisHref('삼성전자 (005930 · KR)'),
    '/analyze?ticker=005930'
  );
  assert.equal(
    sharedStockAnalysisHref('Berkshire Hathaway (BRK.B · US)'),
    '/analyze?ticker=BRK.B'
  );
  assert.equal(
    new URL(
      sharedStockAnalysisHref('특수 회사 & A'),
      'https://idiotquant.com'
    ).searchParams.get('ticker'),
    '특수 회사 & A'
  );
  assert.equal(sharedStockAnalysisHref(''), '/analyze');
  assert.ok(
    sharedStockAnalysisHref('javascript:alert(1)').startsWith(
      '/analyze?ticker='
    )
  );
});

test('공유 결과를 불러오지 못해도 주요 서비스로 직접 이동할 수 있다', () => {
  assert.deepEqual(
    SHARE_SERVICE_PAGES.map((page) => page.href),
    ['/screener', '/compare', '/analyze', '/calculator']
  );
});
