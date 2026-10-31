import { test } from 'node:test';
import assert from 'node:assert/strict';
import { navigationScroll, type NavigationScrollState } from '../lib/navigation-scroll.ts';

const initial = (y = 64): NavigationScrollState => ({ y, direction: 0, travel: 0, hidden: false });

test('상단 64px에서는 보이고 이후 같은 방향 누적 12px에서 숨긴다', () => {
  let state = navigationScroll(initial(0), 64, false, false);
  assert.equal(state.hidden, false);
  for (const y of [67, 70, 73]) state = navigationScroll(state, y, false, false);
  assert.equal(state.hidden, false);
  state = navigationScroll(state, 76, false, false);
  assert.equal(state.hidden, true);
  assert.equal(state.travel, 0);
});

test('미세 왕복은 누적하지 않고 위로 12px 이동하면 복원한다', () => {
  let state = navigationScroll(initial(100), 112, false, false);
  for (const y of [109, 112, 108, 112]) state = navigationScroll(state, y, false, false);
  assert.equal(state.hidden, true);
  state = navigationScroll(state, 106, false, false);
  assert.equal(state.hidden, true);
  state = navigationScroll(state, 100, false, false);
  assert.equal(state.hidden, false);
});

test('최하단·메뉴·키보드 포커스·상단 복귀에서는 표시하고 누적을 비운다', () => {
  const hidden = navigationScroll(initial(100), 120, false, false);
  for (const [y, bottom, locked] of [[120, true, false], [121, false, true], [0, false, false]] as const) {
    const state = navigationScroll(hidden, y, bottom, locked);
    assert.equal(state.hidden, false);
    assert.equal(state.travel, 0);
    assert.equal(state.direction, 0);
  }
  assert.equal(navigationScroll(hidden, 120, false, false).hidden, true);
  assert.equal(navigationScroll(hidden, -10, false, false).y, 0);
});
