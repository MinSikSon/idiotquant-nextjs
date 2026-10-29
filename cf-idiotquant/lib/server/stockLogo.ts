const LOGO_SERVER = 'https://kr-logo-api.tofu89223.workers.dev';
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_HTML_BYTES = 512 * 1024;

export class LogoError extends Error {
    status: number;
    constructor(message: string, status = 400) { super(message); this.status = status; }
}

export function validateCompany(ticker: unknown, name: unknown) {
    if (typeof ticker !== 'string' || !/^\d{6}$/.test(ticker)) throw new LogoError('국내 종목코드를 확인해 주세요.');
    if (typeof name !== 'string' || !name.trim() || name.length > 100) throw new LogoError('기업명을 확인해 주세요.');
    return { ticker, name: name.trim() };
}

export function publicWebsite(value: string, base?: string): URL {
    let url: URL;
    try { url = new URL(value, base); } catch { throw new LogoError('올바른 홈페이지 또는 이미지 주소를 입력해 주세요.'); }
    const host = url.hostname;
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port ||
        !/^(?:[a-z0-9-]+\.)+[a-z]{2,63}$/i.test(host) ||
        /(?:^|\.)(?:localhost|local|internal|test|invalid|example|onion)$/.test(host)) {
        throw new LogoError('공개된 기업 홈페이지 주소만 사용할 수 있습니다.');
    }
    url.hash = '';
    return url;
}

export function isPublicIpv4(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(p => !Number.isInteger(p) || p < 0 || p > 255)) return false;
    const [a, b, c] = parts;
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
        (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)) || (b === 88 && c === 99))) ||
        (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
        (a === 203 && b === 0 && c === 113));
}

export function isPublicIpv6(ip: string): boolean {
    let host: string;
    try { host = new URL(`https://[${ip}]/`).hostname.slice(1, -1); } catch { return false; }
    // 현재 공개 유니캐스트 범위만 허용한다. 매핑 주소·로컬·전환·문서용 범위는 제외한다.
    if (!/^[23][\da-f]{3}:/.test(host) || /^(?:2002|3fff):/.test(host) || /^2001:db8:/.test(host)) return false;
    return !host.startsWith('2001:') || parseInt(host.split(':')[1] || '0', 16) >= 0x200;
}

// Edge 환경에서도 사설 주소로 연결되는 도메인을 거절한다. 요청마다 확인하고 리디렉션에도 적용한다.
async function checkPublicDns(host: string, signal: AbortSignal) {
    const answers = await Promise.all(['A', 'AAAA'].map(async type => {
        const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`, {
            headers: { Accept: 'application/dns-json' }, redirect: 'error', signal,
        });
        if (!response.ok) throw new LogoError('홈페이지 주소를 확인할 수 없습니다.', 502);
        const dns = await response.json() as { Answer?: { type: number; data: string }[] };
        return (dns.Answer ?? []).filter(answer => answer.type === 1 || answer.type === 28);
    }));
    const addresses = answers.flat();
    if (!addresses.length || addresses.some(answer => answer.type === 1 ? !isPublicIpv4(answer.data) : !isPublicIpv6(answer.data))) {
        throw new LogoError('공개된 기업 홈페이지 주소만 사용할 수 있습니다.');
    }
}

export async function readLimited(response: Response, limit: number): Promise<Uint8Array> {
    const reader = response.body?.getReader();
    if (!reader) throw new LogoError('응답 내용이 없습니다.', 502);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > limit) throw new LogoError('이미지 또는 홈페이지 용량이 너무 큽니다.');
            chunks.push(value);
        }
    } finally { await reader.cancel(); }
    const result = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
    return result;
}

async function fetchWebsite(input: URL, signal: AbortSignal) {
    let url = input;
    for (let redirects = 0; redirects <= 3; redirects++) {
        await checkPublicDns(url.hostname, signal);
        const response = await fetch(url, {
            redirect: 'manual', signal, credentials: 'omit',
            headers: { Accept: 'text/html,image/*;q=0.9' },
        });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
            const location = response.headers.get('location');
            await response.body?.cancel();
            if (!location) break;
            url = publicWebsite(location, url.href);
            continue;
        }
        if (!response.ok) { await response.body?.cancel(); throw new LogoError('해당 주소에서 이미지를 가져올 수 없습니다.', 422); }
        const isHtml = response.headers.get('content-type')?.includes('text/html');
        const bytes = await readLimited(response, isHtml ? MAX_HTML_BYTES : MAX_IMAGE_BYTES);
        return { bytes, url, isHtml };
    }
    throw new LogoError('홈페이지 이동이 너무 많습니다.', 422);
}

function decodeAttribute(value: string): string {
    return value.replace(/&(?:amp|quot|apos|lt|gt|#(x[\da-f]+|\d+));/gi, (entity, code: string | undefined) => {
        if (code) {
            const n = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
            return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
        }
        return ({ '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' } as Record<string, string>)[entity.toLowerCase()] ?? entity;
    });
}

export function logoCandidates(html: string, pageUrl: string): URL[] {
    const candidates: { url: URL; priority: number }[] = [];
    // 스크립트·주석 안의 가짜 태그는 후보에서 제외한다.
    const markup = html.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
    for (const tag of markup.matchAll(/<(img|link|meta)\b[^>]*>/gi)) {
        const attrs: Record<string, string> = {};
        for (const attr of tag[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
            attrs[attr[1].toLowerCase()] = decodeAttribute(attr[2] ?? attr[3] ?? attr[4]);
        }
        const type = tag[1].toLowerCase();
        let value = '', priority = 9;
        if (type === 'img' && /logo|로고/i.test([attrs.src, attrs['data-src'], attrs.alt, attrs.id, attrs.class].join(' '))) {
            value = attrs['data-src'] || attrs.src; priority = 0;
        } else if (type === 'link' && /(?:^|\s)(?:icon|apple-touch-icon)(?:\s|$)/i.test(attrs.rel ?? '')) {
            value = attrs.href; priority = attrs.rel.includes('apple') ? 1 : 2;
        } else if (type === 'meta' && (attrs.property ?? attrs.name) === 'og:image') {
            value = attrs.content; priority = 3;
        }
        if (value) {
            try { candidates.push({ url: publicWebsite(value, pageUrl), priority }); } catch { /* 공개 이미지 주소만 사용한다. */ }
        }
    }
    candidates.push({ url: publicWebsite('/favicon.ico', pageUrl), priority: 4 });
    return [...new Map(candidates.sort((a, b) => a.priority - b.priority).map(c => [c.url.href, c.url])).values()].slice(0, 6);
}

export function imageMime(bytes: Uint8Array): string | null {
    const starts = (...prefix: number[]) => prefix.every((value, index) => bytes[index] === value);
    if (starts(137, 80, 78, 71, 13, 10, 26, 10)) return 'image/png';
    if (starts(255, 216, 255)) return 'image/jpeg';
    if (starts(71, 73, 70, 56)) return 'image/gif';
    if (starts(0, 0, 1, 0)) return 'image/x-icon';
    if (starts(82, 73, 70, 70) && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
    // SVG는 브라우저의 이미지 모드에서 미리보기만 하고, 저장 시 PNG로 변환한다.
    if (/^(?:\s|<\?xml[^>]*\?>|<!--[\s\S]*?-->)*<svg[\s>]/i.test(new TextDecoder().decode(bytes))) return 'image/svg+xml';
    return null;
}

export function toBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
}

export async function discoverLogo(website: string) {
    const signal = AbortSignal.timeout(20_000);
    const page = await fetchWebsite(publicWebsite(website), signal);
    if (!page.isHtml) {
        const mime = imageMime(page.bytes);
        if (!mime) throw new LogoError('지원하는 이미지가 아닙니다.', 422);
        return { dataUrl: `data:${mime};base64,${toBase64(page.bytes)}` };
    }
    for (const url of logoCandidates(new TextDecoder().decode(page.bytes), page.url.href)) {
        try {
            const image = await fetchWebsite(url, signal);
            const mime = imageMime(image.bytes);
            if (mime) return { dataUrl: `data:${mime};base64,${toBase64(image.bytes)}` };
        } catch { if (signal.aborted) break; }
    }
    throw new LogoError('로고를 찾지 못했습니다. 로고 이미지 주소를 직접 입력해 주세요.', 422);
}

export async function logoMissing(ticker: string): Promise<boolean> {
    const response = await fetch(`${LOGO_SERVER}/view/${ticker}`, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8_000) });
    await response.body?.cancel();
    if (response.status === 404) return true;
    if (!response.ok) throw new LogoError('로고 서버에 연결할 수 없습니다.', 502);
    return false;
}

export async function saveLogo(ticker: string, name: string, imageBase64: unknown, password: string) {
    if (typeof imageBase64 !== 'string' || imageBase64.length > MAX_IMAGE_BYTES * 1.4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
        throw new LogoError('이미지 크기 또는 형식을 확인해 주세요.');
    }
    let bytes: Uint8Array;
    try { bytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0)); }
    catch { throw new LogoError('이미지 형식을 확인해 주세요.'); }
    if (bytes.length > MAX_IMAGE_BYTES || imageMime(bytes) !== 'image/png') throw new LogoError('PNG 이미지로 다시 시도해 주세요.');
    if (!await logoMissing(ticker)) throw new LogoError('이미 등록된 로고가 있습니다. 화면을 새로고침해 주세요.', 409);
    const response = await fetch(`${LOGO_SERVER}/upload`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bizNo: ticker, corpName: name, format: 'png', imageBase64, adminPw: password }),
    });
    // 인증 실패 응답에 비밀번호 등 서버 내부 정보가 포함되더라도 브라우저에 전달하지 않는다.
    await response.body?.cancel();
    if (!response.ok) throw new LogoError('로고 저장에 실패했습니다. 서버 연결과 등록 설정을 확인해 주세요.', 502);
}

export async function handleLogoRequest(req: Request, user: { role?: string } | null | undefined, password: string | undefined) {
    const json = (body: object, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
    if (user?.role !== 'admin') return json({ error: '관리자만 로고를 등록할 수 있습니다.' }, 403);
    // 로그인 쿠키를 이용한 외부 사이트의 등록 요청은 거절한다.
    if (req.method !== 'GET' && req.headers.get('origin') !== new URL(req.url).origin) return json({ error: '잘못된 요청입니다.' }, 403);
    try {
        if (req.method === 'GET') {
            const { ticker } = validateCompany(new URL(req.url).searchParams.get('ticker'), '조회');
            return json({ missing: await logoMissing(ticker) });
        }
        if (!password) throw new LogoError('로고 등록용 서버 설정이 필요합니다.', 503);
        let body;
        try { body = JSON.parse(new TextDecoder().decode(await readLimited(new Response(req.body), 3 * 1024 * 1024))); }
        catch (error) { if (error instanceof LogoError) throw error; throw new LogoError('입력 내용을 확인해 주세요.'); }
        if (!body || typeof body !== 'object') throw new LogoError('입력 내용을 확인해 주세요.');
        const { ticker, name } = validateCompany(body.ticker, body.name);
        if (req.method === 'POST') {
            if (typeof body.website !== 'string' || body.website.length > 2048) throw new LogoError('홈페이지 주소를 확인해 주세요.');
            if (!await logoMissing(ticker)) throw new LogoError('이미 등록된 로고가 있습니다.', 409);
            return json(await discoverLogo(body.website));
        }
        if (req.method !== 'PUT') return json({ error: '지원하지 않는 요청입니다.' }, 405);
        await saveLogo(ticker, name, body.imageBase64, password);
        return json({ success: true });
    } catch (error) {
        return json({ error: error instanceof LogoError ? error.message : '로고 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.' }, error instanceof LogoError ? error.status : 502);
    }
}
