import { parseSnapshot, serializeSnapshot, type ResultSnapshot } from './snapshot';

export const SERVICE_URL = 'https://idiotquant.com';
const VALID_ID = /^[a-f0-9]{24}$/;

export async function createSnapshotLink(snapshot: ResultSnapshot, origin: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch('/api/proxy/result-shares', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: serializeSnapshot(snapshot), signal,
  });
  if (!response.ok) {
    if (response.status === 413) throw new Error('결과가 너무 큽니다. 결과 파일로 공유해 주세요.');
    if (response.status === 429) throw new Error('공유 링크를 여러 번 만들었습니다. 잠시 후 다시 시도해 주세요.');
    throw new Error('공유 링크를 저장하지 못했습니다. 다시 시도하거나 결과 파일을 이용해 주세요.');
  }
  const result = await response.json();
  if (typeof result.id !== 'string' || !VALID_ID.test(result.id)) throw new Error('공유 링크 응답이 올바르지 않습니다.');
  const url = new URL('/share', origin);
  url.searchParams.set('id', result.id);
  return url.href;
}

export async function loadSnapshot(id: string, signal?: AbortSignal): Promise<ResultSnapshot> {
  if (!VALID_ID.test(id)) throw new Error('공유 링크가 올바르지 않습니다.');
  const response = await fetch(`/api/proxy/result-shares/${id}`, { signal });
  if (response.status === 404) throw new Error('공유 결과를 찾을 수 없거나 보관 기간이 지났습니다. 새 링크를 받아 주세요.');
  if (!response.ok) throw new Error('공유 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
  return parseSnapshot(await response.text());
}

export function imageShareData(snapshot: ResultSnapshot, image: File): ShareData {
  return { title: snapshot.title, url: SERVICE_URL, text: `${snapshot.title}\n직접 종목을 발굴하고 비교해 보세요.`, files: [image] };
}
