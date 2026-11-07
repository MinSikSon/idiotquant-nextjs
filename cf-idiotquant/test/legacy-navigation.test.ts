import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

// 페이지·미들웨어 본문을 실행하고 프레임워크 경계만 대체한다.
function load(relative: string, modules: Record<string, unknown>) {
  const source = readFileSync(new URL(relative, import.meta.url), 'utf8');
  const script = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const output = { exports: {} as { default: (props: any) => any } };
  runInNewContext(script, {
    module: output, exports: output.exports, URL, URLSearchParams, Response,
    require(name: string) {
      assert.ok(name in modules, `예상하지 못한 import: ${name}`);
      return modules[name];
    },
  });
  return output.exports.default;
}

for (const country of ['kr', 'us']) {
  test(`기존 ${country} 잔고 주소는 계좌·반복 쿼리를 보존하고 국가를 고정한다`, async () => {
    const page = load(`../app/(balance-${country})/balance-${country}/page.tsx`, {
      'next/navigation': { redirect: (url: string) => { throw new Error(url); } },
    });
    for (const params of [{}, { key: '계좌 & 선택', country: ['wrong', 'other'], tag: ['a', 'b'], empty: '', missing: undefined }]) {
      await assert.rejects(page({ searchParams: Promise.resolve(params) }), (error: Error) => {
        const url = new URL(error.message, 'https://idiotquant.com');
        assert.equal(url.pathname, '/balance');
        assert.deepEqual(url.searchParams.getAll('country'), [country]);
        if ('key' in params) {
          assert.equal(url.searchParams.get('key'), params.key);
          assert.deepEqual(url.searchParams.getAll('tag'), ['a', 'b']);
          assert.equal(url.searchParams.get('empty'), '');
          assert.equal(url.searchParams.has('missing'), false);
        }
        return true;
      });
    }
  });
}

test('비활성 백테스트 페이지는 발굴로 이동한다', () => {
  const page = load('../app/(backtest)/backtest/page.tsx', {
    'next/navigation': { redirect: (url: string) => { throw new Error(url); } },
  });
  assert.throws(() => page({}), { message: '/screener' });
});

test('기존 잔고 주소와 통합 주소는 익명·일반 계정을 차단하고 관리자만 허용한다', () => {
  const middleware = load('../middleware.ts', {
    'next-auth': { __esModule: true, default: () => ({ auth: (handler: unknown) => handler }) },
    '@/auth.config': { authConfig: {} },
    'next/server': { NextResponse: { next: () => 'next', redirect: Response.redirect } },
  });
  for (const path of ['/balance-kr', '/balance-us', '/balance']) {
    for (const role of [null, 'user', 'admin']) {
      const url = new URL(`${path}?key=test-account`, 'https://idiotquant.com');
      const response = middleware({ auth: role ? { user: { role } } : null, nextUrl: url, url: url.href });
      if (role === 'admin') assert.equal(response, 'next');
      else assert.equal(response.headers.get('location'), `https://idiotquant.com${role ? '/' : '/login'}`);
    }
  }
});
