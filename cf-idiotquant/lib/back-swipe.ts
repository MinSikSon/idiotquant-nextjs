export type SwipePoint = { x: number; y: number; time: number };

/** 세로 스크롤·짧은 움직임을 뒤로가기 동작과 구분한다. */
export function backSwipe(start: SwipePoint, end: SwipePoint, width: number) {
  const dx = end.x - start.x;
  const dy = Math.abs(end.y - start.y);
  const cancelled = dx < -12 || dy > 12 && dy > Math.abs(dx);
  const offset = !cancelled && dx > 12 && dx > dy * 1.5 ? dx : 0;
  const threshold = Math.min(120, Math.max(80, width * .25));
  const fast = dx >= 48 && end.time - start.time <= 250;
  return { cancelled, offset, dismiss: offset > 0 && dx > dy * 2 && (dx >= threshold || fast) };
}
