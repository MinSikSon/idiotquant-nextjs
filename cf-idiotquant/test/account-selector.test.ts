import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

type Element = { type: string; props: any; children: any[] };
function elements(node: any, type: string): Element[] {
    if (Array.isArray(node)) return node.flatMap(child => elements(child, type));
    if (!node || typeof node !== 'object') return [];
    return [...(node.type === type ? [node] : []), ...elements(node.children, type)];
}
function setup() {
    let state: any = null;
    const effects: (() => (() => void) | undefined)[] = [];
    const requests: { country: string; resolve: (accounts: any[]) => void }[] = [];
    const output = { exports: {} as any };
    const script = ts.transpileModule(readFileSync(new URL('../components/balance/shared.tsx', import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
    }).outputText;
    runInNewContext(script, {
        exports: output.exports, module: output,
        React: { createElement: (type: string, props: any, ...children: any[]) => ({ type, props, children }) },
        require(name: string) {
            if (name === 'react') return { useState: () => [state, (value: any) => { state = value; }], useEffect: (fn: any) => effects.push(fn) };
            if (name.endsWith('/tradingAccountAPI')) return { listTradingAccounts: (country: string) => new Promise(resolve => requests.push({ country, resolve })) };
            return {};
        },
    });
    const props = {
        country: 'US', balanceKey: 'inactive', isMaster: true, setBalanceKey: () => {},
        kakaoMemberList: { list: [
            { key: 'active', value: { nickname: '운용 회원' } },
            { key: 'inactive', value: { nickname: '중단 회원' } },
            { key: 'unregistered', value: { nickname: '미등록 회원' } },
        ] },
    };
    return { render: (overrides = {}) => output.exports.AccountSelector({ ...props, ...overrides }), effects, requests };
}

test('선택 목록은 해당 시장의 운용 대상 계정만 표시하며 회원 이름을 연결한다', async () => {
    const h = setup();
    assert.equal(elements(h.render(), 'select')[0].props.disabled, true);
    h.effects.shift()!();
    assert.equal(h.requests[0].country, 'US');
    h.requests[0].resolve([{ user_id: 'active', is_active: true }, { user_id: 'inactive', is_active: false }, { user_id: 'new', is_active: true }]);
    await Promise.resolve();
    const tree = h.render();
    const options = elements(tree, 'option');
    assert.deepEqual(options.map(option => option.props.value), ['', 'active', 'new']);
    assert.equal(options[1].children[0], '운용 회원 (active)');
    assert.equal(options[2].children[0], 'new');
    assert.equal(elements(tree, 'select')[0].props.value, '');
    assert.equal(elements(h.render({ balanceKey: 'active' }), 'select')[0].props.value, 'active');
});

test('시장 변경 시 이전 목록과 늦게 도착한 응답을 표시하지 않는다', async () => {
    const h = setup();
    h.render();
    const cancel = h.effects.shift()!()!;
    cancel();
    const pending = h.render({ country: 'KR' });
    assert.equal(elements(pending, 'select')[0].props.disabled, true);
    h.effects.shift()!();
    h.requests[1].resolve([{ user_id: 'kr', is_active: true }]);
    await Promise.resolve();
    h.requests[0].resolve([{ user_id: 'us', is_active: true }]);
    await Promise.resolve();
    assert.deepEqual(elements(h.render({ country: 'KR' }), 'option').map(option => option.props.value), ['', 'kr']);
});

test('운용 계정이 없으면 빈 상태를 표시하고 선택을 비활성화한다', async () => {
    const h = setup();
    h.render();
    h.effects.shift()!();
    h.requests[0].resolve([{ user_id: 'inactive', is_active: false }]);
    await Promise.resolve();
    const tree = h.render();
    assert.equal(elements(tree, 'select')[0].props.disabled, true);
    assert.equal(elements(tree, 'option')[0].children[0], '운용 중인 계좌가 없습니다');
});

test('마스터가 아니면 목록을 조회하거나 표시하지 않는다', () => {
    const h = setup();
    assert.equal(h.render({ isMaster: false }), null);
    h.effects.shift()!();
    assert.equal(h.requests.length, 0);
});
