import type { ResultSnapshot } from './snapshot';

export function liveScreenTarget(snapshot: ResultSnapshot): string | undefined {
  const url = new URL(snapshot.sourcePath, 'https://idiotquant.com');
  if (url.origin !== 'https://idiotquant.com' || url.pathname !== `/${snapshot.kind}`) return;
  if (snapshot.kind !== 'screener' && snapshot.kind !== 'calculator') return;
  if (url.searchParams.get('filter') === 'liked') return;
  return url.pathname + url.search;
}
