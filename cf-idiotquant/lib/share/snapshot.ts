export type SnapshotTable = { title: string; columns: string[]; rows: string[][] };
export type ResultSnapshot = {
  version: 1;
  kind: 'screener' | 'compare' | 'analyze' | 'calculator';
  title: string;
  createdAt: string;
  sourcePath: string;
  summary: { label: string; value: string }[];
  tables: SnapshotTable[];
  notes: string[];
};

export const MAX_SNAPSHOT_BYTES = 2_000_000;
export const MAX_SHARE_LINK_LENGTH = 12_000;
const invalid = () => new Error('공유 결과의 형식이 올바르지 않습니다.');
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 1000): string {
  if (typeof value !== 'string' || value.length > max) throw invalid();
  return value;
}
function array(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw invalid();
  return value;
}

// 공유 파일과 링크는 외부 입력이다. HTML을 받지 않고 표시용 필드만 다시 구성한다.
export function validateSnapshot(value: unknown): ResultSnapshot {
  const data = record(value);
  if (data.version !== 1 || !['screener', 'compare', 'analyze', 'calculator'].includes(String(data.kind))) throw invalid();
  const sourcePath = text(data.sourcePath, 4096);
  const url = new URL(sourcePath, 'https://idiotquant.com');
  if (!sourcePath.startsWith('/') || sourcePath.startsWith('//') || url.origin !== 'https://idiotquant.com' ||
      !['/screener', '/compare', '/analyze', '/calculator'].includes(url.pathname)) throw invalid();
  const createdAt = text(data.createdAt, 40);
  if (!Number.isFinite(Date.parse(createdAt))) throw invalid();
  return {
    version: 1, kind: data.kind as ResultSnapshot['kind'], title: text(data.title, 160), createdAt, sourcePath,
    summary: array(data.summary, 12).map(item => {
      const pair = record(item);
      return { label: text(pair.label, 100), value: text(pair.value, 300) };
    }),
    tables: array(data.tables, 24).map(item => {
      const table = record(item);
      const columns = array(table.columns, 24).map(column => text(column, 100));
      if (!columns.length) throw invalid();
      return {
        title: text(table.title, 160), columns,
        rows: array(table.rows, 3000).map(item => {
          const row = array(item, 24).map(cell => text(cell));
          if (row.length !== columns.length) throw invalid();
          return row;
        }),
      };
    }),
    notes: array(data.notes, 24).map(note => text(note, 3000)),
  };
}

export function serializeSnapshot(snapshot: ResultSnapshot): string {
  const json = JSON.stringify(validateSnapshot(snapshot));
  if (new TextEncoder().encode(json).length > MAX_SNAPSHOT_BYTES) throw new Error('공유할 결과의 용량이 너무 큽니다. 종목 수를 줄여 주세요.');
  return json;
}
export function parseSnapshot(json: string): ResultSnapshot {
  if (new TextEncoder().encode(json).length > MAX_SNAPSHOT_BYTES) throw invalid();
  try { return validateSnapshot(JSON.parse(json)); }
  catch { throw invalid(); }
}

async function readLimited(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_SNAPSHOT_BYTES) { await reader.cancel(); throw invalid(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

export async function encodeSnapshot(snapshot: ResultSnapshot): Promise<string> {
  const json = serializeSnapshot(snapshot);
  const compress = typeof CompressionStream !== 'undefined';
  const stream = new Blob([json]).stream();
  const bytes = await readLimited(compress ? stream.pipeThrough(new CompressionStream('gzip')) : stream);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `${compress ? 'g' : 'j'}.${btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')}`;
}

export async function decodeSnapshot(encoded: string): Promise<ResultSnapshot> {
  if (encoded.length > MAX_SHARE_LINK_LENGTH || !/^[gj]\.[A-Za-z0-9_-]+$/.test(encoded)) throw invalid();
  if (encoded.startsWith('g.') && typeof DecompressionStream === 'undefined') {
    throw new Error('이 브라우저에서는 공유 링크를 열 수 없습니다. 최신 브라우저를 이용해 주세요.');
  }
  try {
    const base64 = encoded.slice(2).replaceAll('-', '+').replaceAll('_', '/');
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    let stream = new Blob([bytes]).stream();
    if (encoded.startsWith('g.')) stream = stream.pipeThrough(new DecompressionStream('gzip'));
    return parseSnapshot(new TextDecoder().decode(await readLimited(stream)));
  } catch { throw new Error('공유 링크의 데이터를 읽지 못했습니다. 원본 링크나 결과 파일을 다시 받아 주세요.'); }
}

export async function snapshotLink(snapshot: ResultSnapshot, origin: string): Promise<string> {
  const url = new URL('/share', origin);
  url.hash = `r=${await encodeSnapshot(snapshot)}`;
  if (url.href.length > MAX_SHARE_LINK_LENGTH) throw new Error('결과가 많아 링크로 공유하기 어렵습니다. 결과 파일을 저장해 전달해 주세요.');
  return url.href;
}
