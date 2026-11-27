function drawRangeForCapture(input: HTMLInputElement, doc: Document) {
  const slider = doc.createElement('div');
  const track = doc.createElement('div');
  const fill = doc.createElement('div');
  const thumb = doc.createElement('div');
  const { accentColor, display } = doc.defaultView!.getComputedStyle(input);
  const min = input.min ? Number(input.min) : 0;
  const max = input.max ? Number(input.max) : 100;
  const percent = max > min ? (100 * (input.valueAsNumber - min)) / (max - min) : 0;
  const accent = accentColor === 'auto' ? '#126557' : accentColor;

  slider.className = input.className;
  slider.style.cssText = `display:${display};position:relative;vertical-align:middle`;
  track.style.cssText = 'position:absolute;inset:50% 7px auto;height:6px;transform:translateY(-50%);border-radius:6px;background:#737373';
  fill.style.cssText = `width:${percent}%;height:100%;border-radius:inherit;background:${accent}`;
  thumb.style.cssText = `position:absolute;left:${percent}%;top:50%;width:14px;height:14px;border-radius:50%;background:${accent};transform:translate(-50%,-50%)`;
  track.append(fill, thumb);
  slider.append(track);
  input.replaceWith(slider);
}

export async function captureScreen() {
  const { scrollX } = window;
  const root = document.documentElement;
  // The cloned document excludes the open menu and its fixed-body scroll lock.
  const menuOffset = root.style.getPropertyValue('--mobile-menu-page-offset');
  const scrollY = menuOffset ? -parseFloat(menuOffset) : window.scrollY;
  const { left, width } = document.body.getBoundingClientRect();
  const { clientWidth: viewportWidth, clientHeight: viewportHeight } = root;

  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(document.documentElement, {
    x: scrollX + Math.max(0, left),
    y: scrollY,
    scrollX,
    scrollY,
    width: Math.min(width, viewportWidth),
    height: viewportHeight,
    scale: Math.min(window.devicePixelRatio, 2),
    useCORS: true,
    imageTimeout: 3000,
    logging: false,
    ignoreElements: element => element.matches('.navigation-popover, nextjs-portal, ins.adsbygoogle'),
    onclone: doc => {
      // 복제한 문서에서는 부드러운 스크롤을 기다리지 않고 실제 위치를 맞춘다.
      doc.defaultView?.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
      doc.querySelectorAll<HTMLElement>('[data-share-controls], [data-navigation-actions], .navigation-search, dialog').forEach(element => {
        element.style.visibility = 'hidden';
      });
      doc.querySelectorAll('[data-navigation-header]').forEach(header => {
        header.classList.remove('bg-surface-canvas/95', 'dark:bg-surface-dark-canvas/95');
        header.classList.add('bg-surface-canvas', 'dark:bg-surface-dark-canvas');
      });
      doc.querySelectorAll('details:not([open])').forEach(details => {
        const summary = details.querySelector(':scope > summary');
        if (summary) details.replaceChildren(summary);
      });
      doc.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach(input => drawRangeForCapture(input, doc));
    },
  });
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(image => image ? resolve(image) : reject(new Error('캡처 이미지를 만들지 못했습니다.')), 'image/png');
  });
  const file = new File([blob], 'idiotquant-capture.png', { type: 'image/png' });
  return { file, width: canvas.width, height: canvas.height };
}
