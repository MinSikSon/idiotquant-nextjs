import assert from 'node:assert/strict';
import test from 'node:test';
import {
  encodeSnapshot, decodeSnapshot, snapshotLink, parseSnapshot, serializeSnapshot, validateSnapshot,
  MAX_SHARE_LINK_LENGTH, MAX_SNAPSHOT_BYTES, type ResultSnapshot,
} from '../lib/share/snapshot.ts';
import { compareSnapshot, screenerSnapshot, shareNumber } from '../lib/share/builders.ts';
import { analysisSnapshot } from '../lib/share/analysis.ts';
import { calculatorSnapshot } from '../lib/share/calculator.ts';
import { DEFAULTS, simulate, won } from '../app/(calculator)/calculator/calc.ts';
import type { ComparisonStock } from '../lib/features/compare/compareSlice.ts';

const result: ResultSnapshot = {
  version: 1, kind: 'screener', title: '종목 발굴 결과', createdAt: '2026-10-16T01:00:00.000Z',
  sourcePath: '/screener?per=20&country=KR', summary: [{ label: '종목', value: '1개' }],
  tables: [{ title: '종목', columns: ['회사', 'PER'], rows: [['삼성전자 (005930)', '12.5배']] }],
  notes: ['조회한 시점의 결과입니다.'],
};

test('공유 링크가 한글·조회값·조건·시각을 손실 없이 담으며 시세를 재요청하지 않는다', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('공유 결과를 열 때 네트워크를 호출해서는 안 됩니다.'); };
  try {
    const url = new URL(await snapshotLink(result, 'https://idiotquant.com'));
    assert.equal(url.pathname, '/share');
    assert.equal(url.search, '');
    assert.deepEqual(await decodeSnapshot(new URLSearchParams(url.hash.slice(1)).get('r')!), result);
    assert.deepEqual(parseSnapshot(serializeSnapshot(result)), result);
  } finally { globalThis.fetch = original; }
});

test('공유 직후 원본 배열이 바뀌어도 이미 만든 링크의 데이터는 유지된다', async () => {
  const source = structuredClone(result);
  const encoded = await encodeSnapshot(source);
  source.tables[0].rows[0][1] = '99배';
  assert.equal((await decodeSnapshot(encoded)).tables[0].rows[0][1], '12.5배');
});

test('조회 결과 외 계정·세션 필드는 공유 파일에서 제외한다', () => {
  const source = { ...result, account: 'private-account', accessToken: 'private-token', tables: [{ ...result.tables[0], token: 'private-table-token' }] };
  const json = serializeSnapshot(source);
  assert.equal(json.includes('private-'), false);
  assert.deepEqual(parseSnapshot(json), result);
});

test('다른 버전·손상된 데이터·열 개수가 다른 표·외부 이동 경로를 거부한다', async () => {
  assert.throws(() => validateSnapshot({ ...result, version: 2 }));
  assert.throws(() => parseSnapshot('{invalid json'));
  assert.throws(() => validateSnapshot({ ...result, tables: [{ title: 'bad', columns: ['a'], rows: [['a', 'b']] }] }));
  for (const sourcePath of ['https://evil.example', '//evil.example', 'javascript:alert(1)', '/api/proxy/user', '/admin']) {
    assert.throws(() => validateSnapshot({ ...result, sourcePath }));
  }
  await assert.rejects(decodeSnapshot('g.not-gzip'));
  await assert.rejects(decodeSnapshot('x.invalid'));
  await assert.rejects(decodeSnapshot('j.' + 'a'.repeat(MAX_SHARE_LINK_LENGTH)));
});

test('매우 큰 결과는 잘라서 공유하지 않고 파일 공유가 필요함을 알린다', async () => {
  let seed = 12345;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed.toString(36); }
  const large: ResultSnapshot = { ...result, tables: [{ title: '큰 결과', columns: ['값'], rows: Array.from({ length: 300 }, () => [Array.from({ length: 100 }, random).join('')]) }] };
  assert.equal(validateSnapshot(large).tables[0].rows.length, 300);
  await assert.rejects(snapshotLink(large, 'https://idiotquant.com'), /결과 파일/);
  assert.equal(parseSnapshot(serializeSnapshot(large)).tables[0].rows.length, 300);
});

test('압축을 푼 크기가 제한을 넘는 링크는 중단한다', async () => {
  const stream = new Blob(['a'.repeat(MAX_SNAPSHOT_BYTES + 1000)]).stream().pipeThrough(new CompressionStream('gzip'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  const encoded = 'g.' + Buffer.from(bytes).toString('base64url');
  await assert.rejects(decodeSnapshot(encoded));
});

test('발굴 결과는 받은 순서·시가총액 단위·ROE를 보존하고 원본 계정 필드를 포함하지 않는다', () => {
  const snapshot = screenerSnapshot([
    { name: '국내기업', ticker: '001000', last_price: 10000, per: 10, pbr: 1, eps: 100, bps: 1000, market_cap: 500, strategies: ['low_per'], account: 'secret' },
  ], '/screener', '20261015', 'KR', ['PER 20 이하']);
  assert.equal(snapshot.tables[0].columns[6], '시가총액 (억 원)');
  assert.equal(snapshot.tables[0].rows[0][6], '500');
  assert.equal(snapshot.tables[0].rows[0][4], '10%');
  assert.equal(snapshot.tables[0].rows[0][7], '저PER');
  assert.ok(snapshot.notes.some(note => note.includes('PER 20 이하')));
  assert.equal(serializeSnapshot(snapshot).includes('secret'), false);
});

test('비교 결과는 선택일·실제 거래일·현재 지표·변화율을 함께 공유한다', () => {
  const stock: ComparisonStock = { id: 'one', ticker: '005930', name: '삼성전자', market: 'KR', currency: '₩', per: 10, prices: {
    '2026-10-01': { price: 100, priceDate: '20261001' }, '2026-10-11': { price: 110, priceDate: '20261009' },
  } };
  const snapshot = compareSnapshot([stock], ['2026-10-01', '2026-10-11']);
  assert.deepEqual(snapshot.tables[0].columns.slice(0, 3), ['종목', '2026-10-01 종가', '2026-10-11 종가']);
  assert.ok(snapshot.tables[0].rows[0][2].includes('20261009 종가'));
  assert.ok(snapshot.tables[0].rows[0][2].includes('10%'));
  assert.equal(snapshot.tables[1].rows[0][1], '10%');
});

test('분석 공유는 이미 받은 가격·조회된 시세를 사용하고 비로그인 상세 데이터는 포함하지 않는다', async () => {
  const snapshot = analysisSnapshot({
    title: '삼성전자', sourcePath: '/analyze?ticker=005930', market: 'KR',
    values: { per: 10, pbr: 1, eps: 1000, bps: 10000, curPrice: 10000 }, ncav: null, roe: 10,
    data: { account: 'secret', kiBS: { secret: 'hidden-details' } }, includeDetails: false, verdict: null,
    bars: [{ date: '20261015', close: 10000, volume: 500 }],
  });
  assert.equal(snapshot.tables[0].rows[3][1], '—');
  assert.deepEqual(snapshot.tables[1].rows[0], ['20261015', '₩10,000', '500']);
  const json = serializeSnapshot(snapshot);
  assert.equal(json.includes('secret'), false);
  assert.equal(json.includes('hidden-details'), false);
  assert.deepEqual(await decodeSnapshot(await encodeSnapshot(snapshot)), snapshot);
});

test('0과 결측값을 구분해 공유하며 숫자가 아닌 값은 표시하지 않는다', () => {
  assert.equal(shareNumber(0), '0');
  assert.equal(shareNumber(null), '—');
  assert.equal(shareNumber(undefined), '—');
  assert.equal(shareNumber(Number.NaN), '—');
});

test('상세 분석의 재무 기간·단위와 계산된 평가 가격을 함께 전달한다', async () => {
  const snapshot = analysisSnapshot({
    title: '예시기업', sourcePath: '/analyze?ticker=001000', market: 'KR',
    values: { per: 10, pbr: 1, eps: 1000, bps: 10000, curPrice: 10000 }, ncav: 0.67, roe: 10,
    data: { kiBS: { output: [{ stac_yymm: '202512', cras: '200', total_lblt: '50', total_cptl: '150' }] },
      kiChart: { output1: { lstn_stcn: '1000000', stck_prpr: '10000' } } },
    includeDetails: true, verdict: null, bars: [],
  });
  const shared = await decodeSnapshot(await encodeSnapshot(snapshot));
  assert.deepEqual(shared.tables.find(table => table.title === 'NCAV 청산가치 모델')?.rows[0], ['1.0배', '₩15,000', '50%']);
  const finance = shared.tables.find(table => table.title === '재무상태표 · 억 원');
  assert.deepEqual(finance?.columns, ['계정과목', '2025.12']);
  assert.deepEqual(finance?.rows[0], ['유동자산', '200']);
});

test('계산기는 재계산 대신 이미 나온 결과와 각 해의 무작위 수익률을 전달한다', async () => {
  const inputs = { ...DEFAULTS, rateMode: 'range' as const, seed: 42 };
  const computed = simulate(inputs);
  computed.final = 12345; // 받은 결과를 다시 계산했다면 이 값이 사라진다.
  const snapshot = calculatorSnapshot(inputs, 'detailed', computed);
  const shared = await decodeSnapshot(await encodeSnapshot(snapshot));
  assert.equal(shared.summary[0].value, won(12345));
  assert.equal(shared.tables[2].rows.length, inputs.years);
  assert.equal(shared.tables[2].rows[0][1], '+8.4%');
  assert.equal(shared.tables[3].rows.length, 5);
});


test('압축을 지원하지 않는 환경에서도 작은 결과는 링크로 전달한다', async () => {
  const original = globalThis.CompressionStream;
  try {
    Object.defineProperty(globalThis, 'CompressionStream', { value: undefined, configurable: true, writable: true });
    const encoded = await encodeSnapshot(result);
    assert.ok(encoded.startsWith('j.'));
    assert.deepEqual(await decodeSnapshot(encoded), result);
  } finally { Object.defineProperty(globalThis, 'CompressionStream', { value: original, configurable: true, writable: true }); }
});

test('큰 결과도 데이터 손실 없이 저장하고 100자 미만의 링크로 전달한다', async () => {
  const { createSnapshotLink, loadSnapshot } = await import('../lib/share/client.ts');
  const large: ResultSnapshot = { ...result, tables: [{ title: '전체 종목', columns: ['종목', '값'], rows: Array.from({ length: 2500 }, (_, index) => [`종목 ${index}`, `${index}원`]) }] };
  const id = 'abc012345678901234567890';
  let stored = '';
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const path = String(input); calls.push(path);
    if (path === '/api/proxy/result-shares' && init?.method === 'POST') {
      stored = String(init.body);
      return Response.json({ id }, { status: 201 });
    }
    if (path === `/api/proxy/result-shares/${id}`) return new Response(stored);
    throw new Error(`시세 API 재요청: ${path}`);
  };
  try {
    const url = await createSnapshotLink(large, 'https://idiotquant.com');
    assert.ok(url.length < 100);
    assert.equal(new URL(url).hash, '');
    assert.equal(url.includes('종목'), false);
    assert.deepEqual(await loadSnapshot(new URL(url).searchParams.get('id')!), large);
    assert.equal(calls.length, 2);
  } finally { globalThis.fetch = original; }
});

test('저장 실패·잘못된 응답·만료된 링크를 성공한 공유로 처리하지 않는다', async () => {
  const { createSnapshotLink, loadSnapshot } = await import('../lib/share/client.ts');
  const original = globalThis.fetch;
  try {
    for (const status of [413, 429, 503]) {
      globalThis.fetch = async () => new Response('{}', { status });
      await assert.rejects(createSnapshotLink(result, 'https://idiotquant.com'));
    }
    globalThis.fetch = async () => Response.json({ id: 'https://evil.example' });
    await assert.rejects(createSnapshotLink(result, 'https://idiotquant.com'));
    globalThis.fetch = async () => new Response('{}', { status: 404 });
    await assert.rejects(loadSnapshot('000000000000000000000000'), /보관 기간/);
    globalThis.fetch = async () => { throw new Error('잘못된 id는 요청하지 않음'); };
    await assert.rejects(loadSnapshot('../user'), /올바르지/);
  } finally { globalThis.fetch = original; }
});

test('이미지 기본 공유 데이터에 서비스 접속 URL을 포함한다', async () => {
  const { imageShareData, SERVICE_URL } = await import('../lib/share/client.ts');
  const image = new File(['png'], 'result.png', { type: 'image/png' });
  const payload = imageShareData(result, image);
  assert.equal(payload.url, SERVICE_URL);
  assert.equal(payload.url, 'https://idiotquant.com');
  assert.equal(payload.files?.[0], image);
  assert.ok(payload.text?.includes('발굴하고 비교'));
});

test('저장·복사하는 이미지 자체에도 서비스 URL과 접속 안내가 들어간다', async () => {
  const { snapshotImage } = await import('../lib/share/image.ts');
  const original = globalThis.document;
  const drawn: string[] = [];
  const canvas = { width: 0, height: 0, getContext: () => ({ measureText: (text: string) => ({ width: text.length * 10 }), fillText: (text: string) => drawn.push(text), fillRect() {} }), toBlob: (callback: BlobCallback) => callback(new Blob(['png'], { type: 'image/png' })) };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => canvas } });
  try {
    const image = await snapshotImage(result);
    assert.equal(image.type, 'image/png');
    assert.ok(drawn.some(text => text.includes('https://idiotquant.com') && text.includes('직접 발굴')));
    assert.ok(canvas.height > 380 + result.tables[0].rows.length * 80);
  } finally { Object.defineProperty(globalThis, 'document', { configurable: true, value: original }); }
});
