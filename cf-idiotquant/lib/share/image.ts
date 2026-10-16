import type { ResultSnapshot } from './snapshot';

// 화면 크기·스크롤 위치와 무관하게 읽기 쉬운 요약 카드로 캡처한다.
export async function snapshotImage(snapshot: ResultSnapshot): Promise<File> {
  const table = snapshot.tables[0];
  const rows = table?.rows.slice(0, 5) ?? [];
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 380 + rows.length * 80;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('이미지를 만들 수 없습니다.');
  const font = '"Pretendard Variable", -apple-system, BlinkMacSystemFont, sans-serif';
  function draw(text: string, x: number, y: number, max: number, size = 24, color = '#292827', weight = 400) {
    ctx!.font = `${weight} ${size}px ${font}`;
    ctx!.fillStyle = color;
    let label = text;
    if (ctx!.measureText(label).width > max) {
      while (label && ctx!.measureText(label + '…').width > max) label = label.slice(0, -1);
      label += '…';
    }
    ctx!.fillText(label, x, y);
  }
  ctx.fillStyle = '#f2f0eb'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#421d24'; ctx.fillRect(0, 0, 1200, 12);
  draw('idiotquant · 공유 결과', 60, 64, 1000, 24, '#714cb6', 500);
  draw(snapshot.title, 60, 132, 1080, 44, '#292827', 500);
  draw(`공유 시점 ${new Date(snapshot.createdAt).toLocaleString('ko-KR')}`, 60, 174, 1080, 21, '#666666');
  draw(snapshot.summary.map(item => `${item.label} ${item.value}`).join('  ·  '), 60, 226, 1080, 24);
  const columns = table?.columns.slice(0, 4) ?? [];
  const widths = columns.length <= 2 ? [540, 540] : [450, ...Array(columns.length - 1).fill(630 / (columns.length - 1))];
  let x = 60;
  columns.forEach((column, index) => { draw(column, x, 284, widths[index] - 20, 21, '#666666'); x += widths[index]; });
  rows.forEach((row, rowIndex) => {
    const y = 304 + rowIndex * 80;
    ctx!.fillStyle = '#dedbd5'; ctx!.fillRect(60, y, 1080, 1);
    let columnX = 60;
    columns.forEach((_, columnIndex) => {
      draw(row[columnIndex], columnX, y + 48, widths[columnIndex] - 20, 25, '#292827', columnIndex === 0 ? 500 : 400);
      columnX += widths[columnIndex];
    });
  });
  draw(`${table && table.rows.length > rows.length ? `전체 ${table.rows.length}개 중 ${rows.length}개 요약 · ` : ''}조회 시점의 참고 정보 · 실시간 시세가 아닙니다`, 60, canvas.height - 30, 1080, 20, '#666666');
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('이미지를 만들 수 없습니다.')), 'image/png'));
  return new File([blob], `idiotquant-${snapshot.kind}-${snapshot.createdAt.slice(0, 10)}.png`, { type: 'image/png' });
}

export function downloadFile(file: Blob, name: string) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url; link.download = name;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
