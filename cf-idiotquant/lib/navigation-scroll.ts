export type NavigationScrollState = { y: number; direction: number; travel: number; hidden: boolean };

export function navigationScroll(state: NavigationScrollState, y: number, atBottom: boolean, locked: boolean): NavigationScrollState {
  y = Math.max(0, y);
  const delta = y - state.y;
  const direction = Math.sign(delta);
  if (y <= 64 || atBottom || locked) return { y, direction: 0, travel: 0, hidden: false };
  if (!direction) return { ...state, y };
  const travel = (direction === state.direction ? state.travel : 0) + Math.abs(delta);
  return { y, direction, travel: travel >= 12 ? 0 : travel, hidden: travel >= 12 ? direction > 0 : state.hidden };
}
