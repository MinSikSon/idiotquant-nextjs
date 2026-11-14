import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { buildStockSearchIndex, findStockSuggestions } from '../lib/utils/stockSuggestions.ts';

type Element = { type: string; props: Record<string, any> };

// 브라우저 경계만 대체해 실제 입력·초기화·선택 핸들러를 실행한다.
function render(value: string, inModal = false) {
    const changes: string[] = [];
    const searches: string[] = [];
    let hook = 0;
    const output = { exports: {} as { default: (props: any) => Element } };
    const jsx = (type: string, props: Record<string, any>) => ({ type, props });
    const modules: Record<string, unknown> = {
        react: {
            useState: (initial: unknown) => [hook++ === 1 ? true : initial, () => {}],
            useMemo: (factory: () => unknown) => factory(),
            useEffect: () => {},
            useRef: () => ({ current: { blur() {}, focus() {} } }),
        },
        'react/jsx-runtime': { jsx, jsxs: jsx },
        'react-dom': { createPortal: (children: unknown) => jsx('portal', { children }) },
        '@/lib/utils': { cn: (...args: unknown[]) => args.filter(Boolean).join(' ') },
        '@/lib/ui-controls': { CONTROL_ICON_BUTTON_CLS: '' },
        '@/components/pageHeader': { PAGE_PRIMARY_ACTION_CLS: '' },
        '@/lib/utils/stockSuggestions': { buildStockSearchIndex, findStockSuggestions },
        'lucide-react': {},
    };
    const source = readFileSync(new URL('../components/searchAutoComplete.tsx', import.meta.url), 'utf8');
    runInNewContext(ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    }).outputText, {
        module: output, exports: output.exports,
        require: (name: string) => { assert.ok(name in modules, name); return modules[name]; },
    });
    const tree = output.exports.default({
        resultsTarget: inModal ? {} : undefined,
        value, onQueryChange: (next: string) => changes.push(next),
        onSearchButton: (next: string) => searches.push(next),
        validCorpNameArray: ['005930', '006660', 'AAPL'],
        stockNames: [
            { symbol: '005930', name: '삼성전자' },
            { symbol: '006660', name: '삼성공조' },
            { symbol: 'AAPL', name: 'APPLE INC', koreanName: '애플' },
        ],
    });
    const nodes: Element[] = [];
    const visit = (node: any) => {
        if (Array.isArray(node)) return node.forEach(visit);
        if (!node || typeof node !== 'object' || !node.props) return;
        nodes.push(node);
        visit(node.props.children);
    };
    visit(tree);
    return { nodes, changes, searches, input: nodes.find(node => node.type === 'input')! };
}

test('스크리너 검색어는 외부 초기화·변경과 동기화되고 입력·지우기를 필터에 전달한다', () => {
    const result = render('삼성');
    assert.equal(result.input.props.value, '삼성');
    result.input.props.onChange({ target: { value: '애플' } });
    result.nodes.find(node => node.props['aria-label'] === '검색어 초기화')!.props.onClick();
    assert.deepEqual(result.changes, ['애플', '']);
    assert.equal(render('').input.props.value, '');
    assert.equal(render('AAPL').input.props.value, 'AAPL');
});

test('스크리너 자동완성에서 국문·영문 종목명을 고르면 해당 종목 코드로 필터링한다', () => {
    for (const [query, ticker] of [['삼성전자', '005930'], ['애플', 'AAPL'], ['apple', 'AAPL']]) {
        const result = render(query);
        const option = result.nodes.find(node => node.props.role === 'option');
        assert.ok(option, query);
        option.props.onMouseDown();
        assert.deepEqual(result.changes, [ticker]);
        assert.deepEqual(result.searches, [ticker]);
    }
});

test('모달에서도 결과 영역으로 보낸 자동완성을 선택하면 같은 종목을 전달한다', () => {
    const result = render('애플', true);
    assert.ok(result.nodes.some(node => node.type === 'portal'));
    result.nodes.find(node => node.props.role === 'option')!.props.onMouseDown();
    assert.deepEqual(result.searches, ['AAPL']);
});
