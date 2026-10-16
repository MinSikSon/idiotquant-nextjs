import assert from 'node:assert/strict';
import test from 'node:test';
import { configureStore } from '@reduxjs/toolkit';
import {
  compareSlice, type ComparisonStock, setQuery, setDateInput, setError,
  stockLoadStarted, stockReceived, stockLoadFinished, dateLoadStarted, datePriceReceived,
  dateLoadFinished, removeDate, removeStock, applyLimits, importStarted, importAdvanced,
  importFinished, clearComparison,
} from '../lib/features/compare/compareSlice.ts';

const stock: ComparisonStock = {
  id: 'samsung', name: '삼성전자', ticker: '005930', market: 'KR', currency: '₩',
  currentShares: 5969782550, per: 12.3, pbr: 1.2, eps: 5000, bps: 50000, roe: 10,
  prices: { '2026-10-01': { price: 60000, priceDate: '20261001' } },
};
const createStore = () => configureStore({ reducer: { compare: compareSlice.reducer } });

function addStock(store: ReturnType<typeof createStore>) {
  store.dispatch(dateLoadStarted('2026-10-01'));
  store.dispatch(dateLoadFinished());
  store.dispatch(stockReceived({ stock, limit: 4 }));
}

test('비교 페이지 구독을 종료하고 다시 연결해도 날짜·입력·조회값을 유지한다', () => {
  const store = createStore();
  const leavePage = store.subscribe(() => {});
  addStock(store);
  store.dispatch(setQuery('AAPL'));
  store.dispatch(setDateInput('2026-10-15'));
  const before = store.getState().compare;
  leavePage();
  store.dispatch({ type: 'navigation/other-page' });
  const returnToPage = store.subscribe(() => {});
  assert.deepEqual(store.getState().compare, before);
  assert.deepEqual(store.getState().compare.stocks[0], stock);
  returnToPage();
});

test('페이지를 떠난 사이 완료된 종목·추가 날짜 조회도 결과에 남긴다', () => {
  const store = createStore();
  const leavePage = store.subscribe(() => {});
  store.dispatch(dateLoadStarted('2026-10-01'));
  store.dispatch(dateLoadFinished());
  store.dispatch(stockLoadStarted());
  leavePage();
  store.dispatch(stockReceived({ stock, limit: 4 }));
  store.dispatch(stockLoadFinished());
  store.dispatch(dateLoadStarted('2026-10-15'));
  store.dispatch(datePriceReceived({ id: stock.id, date: '2026-10-15', price: { price: 66000, priceDate: '20261015' } }));
  store.dispatch(dateLoadFinished());
  const state = store.getState().compare;
  assert.deepEqual(state.dates, ['2026-10-01', '2026-10-15']);
  assert.equal(state.stocks[0].prices['2026-10-15'].price, 66000);
  assert.equal(state.loading, false);
  assert.equal(state.dateLoading, false);
});

test('전체 비우기는 입력과 결과를 모두 초기화하고 같은 스크리너 가져오기 표식은 유지한다', () => {
  const store = createStore();
  store.dispatch(importStarted({ source: 'KR:20261001:005930', date: '2026-10-01', total: 1 }));
  store.dispatch(stockReceived({ stock, limit: 4 }));
  store.dispatch(importAdvanced(1));
  store.dispatch(importFinished());
  store.dispatch(setQuery('AAPL'));
  store.dispatch(setError('조회 오류'));
  store.dispatch(clearComparison());
  assert.deepEqual(store.getState().compare, {
    query: '', dateInput: '', dates: [], stocks: [], loading: false, dateLoading: false,
    error: '', importProgress: null, importSource: 'KR:20261001:005930',
  });
  store.dispatch({ type: 'navigation/back-to-compare' });
  assert.equal(store.getState().compare.stocks.length, 0);
});

test('새 스크리너 가져오기는 이전 비교표와 섞지 않으며 중복 종목은 추가하지 않는다', () => {
  const store = createStore();
  addStock(store);
  store.dispatch(importStarted({ source: 'US:20261015:AAPL', date: '2026-10-15', total: 1 }));
  assert.deepEqual(store.getState().compare.dates, ['2026-10-15']);
  assert.equal(store.getState().compare.stocks.length, 0);
  assert.deepEqual(store.getState().compare.importProgress, { loaded: 0, total: 1 });
  const apple: ComparisonStock = { id: 'apple', name: 'Apple', ticker: 'AAPL', market: 'US', currency: '$', prices: {} };
  store.dispatch(stockReceived({ stock: apple, limit: 4 }));
  store.dispatch(stockReceived({ stock: { ...apple, id: 'apple-again' }, limit: 4 }));
  assert.equal(store.getState().compare.stocks.length, 1);
});

test('개별 날짜와 종목을 지운 후 늦게 도착한 가격은 되살리지 않는다', () => {
  const store = createStore();
  addStock(store);
  store.dispatch(dateLoadStarted('2026-10-15'));
  store.dispatch(removeDate('2026-10-15'));
  store.dispatch(datePriceReceived({ id: stock.id, date: '2026-10-15', price: { price: 66000 } }));
  assert.equal(store.getState().compare.stocks[0].prices['2026-10-15'], undefined);
  store.dispatch(removeStock(stock.id));
  assert.equal(store.getState().compare.stocks.length, 0);
});

test('저장된 비교 결과에도 로그인 상태별 날짜·종목 한도를 적용한다', () => {
  const store = createStore();
  addStock(store);
  store.dispatch(stockReceived({ stock: { ...stock, id: 'other', ticker: '000660' }, limit: 4 }));
  store.dispatch(dateLoadStarted('2026-10-15'));
  store.dispatch(dateLoadFinished());
  store.dispatch(applyLimits({ dates: 1, stocks: 1 }));
  assert.deepEqual(store.getState().compare.dates, ['2026-10-01']);
  assert.equal(store.getState().compare.stocks.length, 1);
});
