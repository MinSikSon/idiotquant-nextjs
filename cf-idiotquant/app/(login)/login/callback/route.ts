import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  
  // 1. 토큰 누락 시 로그인 페이지로 즉시 리다이렉트 방어
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", req.url));
  }

  // 리다이렉트 타겟 객체 생성
  const res = NextResponse.redirect(new URL("/user", req.url));

  // 2. 현재 요청의 호스트네임을 기반으로 로컬 개발 환경 유무 정밀 판별
  const isLocalhost = req.nextUrl.hostname === "localhost" || req.nextUrl.hostname === "127.0.0.1";

  // 🔒 보안 가이드: XSS 방지를 위해 httpOnly는 개발/운영 모두 true 권장
  // 미들웨어나 서버 컴포넌트에서는 httpOnly가 true여도 쿠키를 정상적으로 읽을 수 있습니다.
  const httpOnly = true;
  
  // sameSite: "none" 일 때는 무조건 secure: true 여야 브라우저가 쿠키를 수용합니다.
  const secure = isLocalhost ? false : true;
  const sameSite = isLocalhost ? "lax" : "none";

  console.log(`[login/callback/route] Environment - isLocalhost:`, isLocalhost);
  console.log(`[login/callback/route] Cookie Strategy - secure: ${secure}, sameSite: ${sameSite}`);

  // 3. 에지 런타임 표준 Web API를 사용한 안전한 쿠키 주입
  try {
    res.cookies.set("authToken", token, {
      path: "/",
      httpOnly: httpOnly,
      secure: secure,
      sameSite: sameSite,
      maxAge: 60 * 60, // 1시간 (3600초)
    });
  } catch (cookieError) {
    console.error("🚨 [login/callback/route] 쿠키 설정 중 예외 발생:", cookieError);
    return NextResponse.redirect(new URL("/login?error=cookie_set_failed", req.url));
  }

  return res;
}

// 🌐 Cloudflare Workers 및 글로벌 Edge CDN 환경에 최적화된 런타임 명시
export const runtime = 'edge';