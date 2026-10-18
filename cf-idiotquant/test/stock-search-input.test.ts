import assert from 'node:assert/strict';
import test from 'node:test';
import { isUsTicker, resolveStockSearchInput } from '../lib/utils/stockSearchInput.ts';

test('목록에 아직 없는 미국 신규 티커도 대문자로 정규화해 직접 조회한다', () => {
    assert.equal(resolveStockSearchInput(' crwv ', ['AAPL']), 'CRWV');
    assert.equal(resolveStockSearchInput('newipo', ['AAPL']), 'NEWIPO');
    assert.equal(resolveStockSearchInput('삼성전자', ['삼성전자']), '삼성전자');
    assert.equal(resolveStockSearchInput('005930', []), '005930');
});

test('클래스주·우선주 별칭은 실제 목록에 있는 KIS 티커에만 대응시킨다', () => {
    const symbols = ['BRK/B', 'ABR/D', 'AAC/UN', 'ABC.D'];
    assert.equal(resolveStockSearchInput(' brk.b ', symbols), 'BRK/B');
    assert.equal(resolveStockSearchInput('abr^d', symbols), 'ABR/D');
    assert.equal(resolveStockSearchInput('aac/un', symbols), 'AAC/UN');
    assert.equal(resolveStockSearchInput('abc.d', symbols), 'ABC.D');
    assert.equal(resolveStockSearchInput('new.a', symbols), 'NEW.A');
});

test('미국 티커와 국내 코드 이외의 잘못된 입력은 조회 전에 걸러낸다', () => {
    for (const value of ['', ' ', '없는회사', '12345', '1234567', 'CORE WEAVE', 'A&B', 'A?x=1', 'A/B/C', 'A'.repeat(15)]) {
        assert.equal(resolveStockSearchInput(value, []), null, value);
    }
    for (const ticker of ['CRWV', 'BRK/B', 'AAC/UN', 'BRK.B', 'ABR^D', 'PHXE/', 'BF-A']) {
        assert.equal(isUsTicker(ticker), true, ticker);
    }
});
