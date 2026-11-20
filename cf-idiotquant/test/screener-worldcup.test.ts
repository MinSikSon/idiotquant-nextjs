import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { applyFilters, type ScreenerFilters } from '../app/(screener)/screener/filters.ts';
import { worldcupCode, readWorldcupCode, expandWorldcupParams, worldcupFilters, worldcupRounds, type WorldcupAnswer, type WorldcupFilters } from '../app/(screener)/screener/worldcup.ts';

test('월드컵은 선택한 기준만 적용하고 미정·거절에는 필터를 만들지 않는다', () => {
    assert.deepEqual(worldcupFilters(['unknown', 'neither', 'unknown', 'neither'], 'KR'), {
        excludeDeficit: false, maxPer: 0, maxPbr: 0, minTrAmt: 0,
    });
    assert.deepEqual(worldcupFilters(['b', 'a', 'b', 'a'], 'KR'), {
        excludeDeficit: false, maxPer: 20, maxPbr: 0, minTrAmt: 10,
    });
    assert.equal(worldcupFilters(['a', 'a', 'a', 'a'], 'US').minTrAmt, 1);
    assert.match(worldcupRounds('US')[3].a.value, /1백만 달러/);
    assert.match(worldcupRounds('KR')[3].context, /스캔일/);
});

test('월드컵 초안은 기존 전략·검색·직접 필터와 함께 실제 필터 엔진에 적용된다', () => {
    const existing: ScreenerFilters = {
        country: 'KR', strategies: new Set(['custom']), mode: 'OR', q: '후보',
        excludeHoldings: false, excludeDeficit: false, excludePreferred: false, excludeAdr: false,
        excludeHalted: false, excludeManaged: false, excludeDelisting: false,
        sectors: new Set(['소재']), markets: new Set(), maxW52Pos: 0, minTrAmt: 0,
        minMarketCap: 500, maxPbr: 0, maxPer: 0, minRoe: 0, minNcav: 0,
    };
    const base = { name: '후보', sector: '소재', strategies: ['custom'], market_cap: 1000, eps: 1, per: 10, pbr: 1, acml_tr_pbmn: 2_000_000_000 };
    const list = [base, { ...base, name: '다른 기업' }, { ...base, sector: '금융' }, { ...base, strategies: [] }, { ...base, per: 25 }, { ...base, market_cap: 100 }];
    const proposal = worldcupFilters(['a', 'a', 'a', 'a'], 'KR');
    assert.deepEqual(applyFilters(list, { ...existing, ...proposal }), [base]);
    assert.equal(existing.maxPer, 0);
    const us = { ...base, country: 'US', ticker: 'TEST', net_income: -1, acml_tr_pbmn: 2_000_000 };
    assert.equal(applyFilters([us], { ...existing, country: 'US', ...worldcupFilters(['b', 'a', 'b', 'a'], 'US'), minMarketCap: 0 }).length, 0, '적자 포함 선택도 미국 PER의 기존 순이익 검증을 우회하지 않는다');
});

const source = ts.transpileModule(readFileSync(new URL('../app/(screener)/screener/components/FilterWorldcup.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function harness(country: 'KR' | 'US' = 'KR', hasTradingAmount = true, initialAnswers: WorldcupAnswer[] = []) {
    let sharePath: string | undefined;
    const slots: unknown[] = [];
    let cursor = 0;
    let tree: any;
    const applications: WorldcupFilters[] = [];
    let manual = 0;
    const props = { initialAnswers, country, hasTradingAmount, loading: false, previewCount: () => 2,
        onApply: (proposal: WorldcupFilters) => applications.push(proposal), onManual: () => manual++,
        onSharePathChange: (path?: string) => { sharePath = path; } };
    const react = {
        useState(initial: unknown) {
            const index = cursor++;
            if (!(index in slots)) slots[index] = initial;
            return [slots[index], (next: any) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
        },
        useEffect(effect: () => void) { effect(); },
        useRef() { return { current: null }; },
    };
    const output = { exports: {} as { FilterWorldcup: (input: typeof props) => any } };
    runInNewContext(source, { module: output, exports: output.exports, require(name: string) {
        if (name === 'react') return react;
        if (name === 'react/jsx-runtime') return { jsx: (type: any, props: any) => ({ type, props }), jsxs: (type: any, props: any) => ({ type, props }) };
        if (name === '../worldcup') return { worldcupFilters, worldcupRounds, worldcupCode };
        if (name.endsWith('.module.css')) return { default: {} };
        throw new Error(`Unexpected module: ${name}`);
    } });
    const text = (node: any): string => node == null || typeof node === 'boolean' ? '' : Array.isArray(node) ? node.map(text).join('') : typeof node === 'object' ? text(node.props?.children) : String(node);
    const nodes = (node: any): any[] => node == null || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
    const render = () => { cursor = 0; tree = output.exports.FilterWorldcup(props); };
    const buttons = () => nodes(tree).filter(node => node.type === 'button');
    const click = (label: string) => {
        const button = buttons().find(node => label === 'A' || label === 'B' ? node.props['aria-label']?.startsWith(`선택 ${label}:`) : text(node).includes(label));
        assert.ok(button, `button: ${label}`);
        assert.ok(!button.props.disabled, `enabled: ${label}`);
        button.props.onClick(); render();
    };
    render();
    return { click, props, render, applications, sharePath: () => sharePath, manual: () => manual, text: () => text(tree), buttons, textOf: text };
}

test('선택·앞뒤 이동·다시 시작은 조건을 바꾸지 않고 마지막 적용만 필터를 갱신한다', () => {
    const h = harness();
    h.click('A'); h.click('← 이전 비교'); h.click('B');
    h.click('건너뛰기'); h.click('건너뛰기'); h.click('B');
    assert.equal(h.applications.length, 0);
    assert.match(h.text(), /2종목/);
    h.click('직접 필터 설정');
    assert.equal(h.manual(), 1);
    assert.equal(h.applications.length, 0);
    h.click('처음부터 다시 고르기');
    for (let index = 0; index < 4; index++) h.click('A');
    assert.equal(h.applications.length, 0);
    h.click('필터 적용');
    assert.deepEqual(h.applications, [worldcupFilters(['a', 'a', 'a', 'a'], 'KR')]);
});

test('거래대금 자료가 없거나 사라지면 하한을 적용하지 않고 로딩 중에는 적용을 막는다', () => {
    const h = harness('US');
    for (let index = 0; index < 4; index++) h.click('A');
    h.props.hasTradingAmount = false; h.render();
    assert.match(h.text(), /미정 · 미적용/);
    h.props.loading = true; h.render();
    assert.ok(h.buttons().find(button => h.textOf(button).includes('필터 적용'))?.props.disabled);
    h.props.loading = false; h.render(); h.click('필터 적용');
    assert.equal(h.applications[0].minTrAmt, 0);
    h.click('처음부터 다시 고르기');
    for (let index = 0; index < 3; index++) h.click('B');
    assert.ok(h.buttons().find(button => button.props['aria-label']?.startsWith('선택 A:'))?.props.disabled);
    h.click('건너뛰기');
    assert.match(h.text(), /미정인 1개/);
});


test('짧은 코드는 국내·미국의 모든 답변 조합을 5글자로 손실 없이 복원한다', () => {
    const choices: WorldcupAnswer[] = ['a', 'b', 'unknown', 'neither'];
    for (const country of ['KR', 'US'] as const) {
        for (const a of choices) for (const b of choices) for (const c of choices) for (const d of choices) {
            const answers = [a, b, c, d];
            const code = worldcupCode(country, answers)!;
            assert.equal(code.length, 5);
            assert.deepEqual(readWorldcupCode(code), { country, answers });
            const params = expandWorldcupParams(`w=${code}`);
            const proposal = worldcupFilters(answers, country);
            assert.equal(params.get('country'), country);
            assert.equal(Number(params.get('maxper')), proposal.maxPer);
            assert.equal(Number(params.get('maxpbr')), proposal.maxPbr);
            assert.equal(Number(params.get('mintr')), proposal.minTrAmt);
            assert.equal(params.get('exclude')?.split(',').includes('deficit'), proposal.excludeDeficit);
        }
    }
    for (const invalid of [null, '', 'kaaa', 'kaaaaa', 'xaaaa', 'kAAaa', 'k<a>a', 'uaaaa/extra']) assert.equal(readWorldcupCode(invalid), null);
    assert.equal(worldcupCode('KR', ['a']), null);
});

test('직접 필터 링크는 유지하고 짧은 코드와 함께 지정한 부가 조건도 복원한다', () => {
    assert.equal(expandWorldcupParams('maxper=12&exclude=holdings').toString(), 'maxper=12&exclude=holdings');
    const params = expandWorldcupParams('w=uaaaa&maxper=15&exclude=holdings&group=sector');
    assert.equal(params.get('maxper'), '15');
    assert.equal(params.get('exclude'), 'holdings,deficit');
    assert.equal(params.get('group'), 'sector');
});

test('완료한 월드컵은 공통 헤더에 짧은 경로를 전달하고 다시 고르면 지운다', () => {
    const h = harness('US', true, ['a', 'b', 'unknown', 'a']);
    assert.equal(h.sharePath(), '/screener?w=uabua');
    h.props.hasTradingAmount = false; h.render();
    assert.equal(h.sharePath(), '/screener?w=uabuu');
    h.click('처음부터 다시 고르기');
    assert.equal(h.sharePath(), undefined);
});
