

// Base64Url 디코딩 함수

export function decodeJWT(token: any) {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');

    // 헤더와 페이로드 디코딩
    const decodedHeader = JSON.parse(base64UrlDecode(encodedHeader));
    const decodedPayload = decodeURIComponent(escape(base64UrlDecode(encodedPayload)));
    if (DEBUG) console.log(`[decodeJWT] typeof decodedPayload:`, typeof decodedPayload);
    if (DEBUG) console.log(`[decodeJWT] decodedPayload:`, decodedPayload);
    if (DEBUG) console.log(`[decodeJWT] JSON.stringify(decodedPayload):`, JSON.stringify(decodedPayload));

    return {
        header: decodedHeader,
        payload: JSON.parse(decodedPayload),
        signature: encodedSignature // 서명은 디코딩 없이 반환
    };
}

function base64UrlDecode(str: any) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(
        atob(str)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
    );
}

export async function verifyJWT(token: any, secretKey: any) {
    if (!secretKey || secretKey.length === 0) {
        throw new Error("❌ secretKey가 비어 있습니다. HMAC 서명을 만들 수 없습니다.");
    }

    const [encodedHeader, encodedPayload, receivedSignature] = token.split('.');

    // 서버에서 동일하게 서명 생성
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secretKey),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
    );

    // Base64Url 변환
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    if (expectedSignature === receivedSignature) {
        const payload = JSON.parse(base64UrlDecode(encodedPayload));
        // console.log(`[verifyJWT] true`);
        return { valid: true, payload };
    } else {
        // console.log(`[verifyJWT] false`);
        return { valid: false, payload: null };
    }
}