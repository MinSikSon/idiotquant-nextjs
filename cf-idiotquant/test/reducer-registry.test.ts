import assert from 'node:assert/strict';
import test from 'node:test';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { reducerRegistry } from '../lib/reducerRegistry.ts';

test('스토어 생성 뒤 등록된 기능도 첫 렌더에서 초기 상태를 읽고 기존 상태를 유지한다', () => {
    const base = createSlice({ name: 'registryBase', initialState: { count: 3 }, reducers: {} }).injectInto(reducerRegistry);
    const store = configureStore({ reducer: reducerRegistry });
    const lazy = createSlice({ name: 'registryLazy', initialState: { value: 7 }, reducers: { increment(state) { state.value++; } }, selectors: { value: state => state.value } }).injectInto(reducerRegistry);
    assert.equal(lazy.selectors.value(store.getState()), 7);
    store.dispatch(lazy.actions.increment());
    assert.equal(lazy.selectors.value(store.getState()), 8);
    assert.equal(base.selectSlice(store.getState()).count, 3);
});
