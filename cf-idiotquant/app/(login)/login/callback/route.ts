import { decodeJWT } from "@/lib/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", req.url));
  }

  const res = NextResponse.redirect(new URL("/user", req.url));

  // const httpOnly = process.env.NEXT_PUBLIC_CLIENT_URL === "http://localhost:3000" ? false : true;
  const httpOnly = false;
  const secure = process.env.NEXT_PUBLIC_CLIENT_URL === "http://localhost:3000" ? false : true;
  console.log(`[login/callback/route] secure:`, secure);
  const sameSite = process.env.NEXT_PUBLIC_CLIENT_URL === "http://localhost:3000" ? "lax" : "none";
  console.log(`[login/callback/route] sameSite:`, sameSite);
  // ✅ 여기서 쿠키 세팅 (Route Handler라 가능)
  res.cookies.set("authToken", token, {
    path: "/",
    httpOnly: httpOnly,
    secure: secure,
    sameSite: sameSite,
    maxAge: 60 * 60, // 1시간
  });

  // const jwt = decodeJWT(token);
  // console.log(`[login/callback/route] jwt:`, jwt, `, typeof jwt:`, typeof jwt);
  // const payload = jwt.payload;
  // const jsonPayload = JSON.parse(payload) as any;
  // console.log(`[login/callback/route] payload:`, payload, `, typeof payload:`, typeof payload);
  // console.log(`[login/callback/route] jsonPayload:`, jsonPayload, `, typeof jsonPayload:`, typeof jsonPayload);

  // res.cookies.set("kakaoId", jsonPayload.id, {
  //   path: "/",
  //   httpOnly: httpOnly,
  //   secure: secure,
  //   sameSite: sameSite,
  //   maxAge: 60 * 60, // 1시간
  // });

  // res.cookies.set("kakaoNickName", jsonPayload.properties?.nickname, {
  //   path: "/",
  //   httpOnly: httpOnly,
  //   secure: secure,
  //   sameSite: sameSite,
  //   maxAge: 60 * 60, // 1시간
  // });

  return res;
}

export const runtime = 'edge';
// 🛠 언제 Edge Runtime 쓰면 좋은가?
// Cloudflare Workers, Vercel Edge 같은 글로벌 CDN 네트워크에서 실행하고 싶을 때
// 빠른 cold start, 짧은 응답 시간 필요할 때
// cookies(), headers() 같은 Web API 기반 기능을 활용해야 할 때 (JWT 검사 등)