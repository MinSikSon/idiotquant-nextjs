import { clearCookie } from "@/components/util";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

const DEBUG = true;

export function Logout(router: AppRouterInstance) {
    if (DEBUG) console.log(`[Logout]`);
    clearCookie("authToken");
    clearCookie("koreaInvestmentToken");

    const redirectLogoutUrl = `${process.env.NEXT_PUBLIC_API_URL}/kakao-logout`;
    const authorizeEndpoint = `https://kauth.kakao.com/oauth/logout?client_id=${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}&logout_redirect_uri=${redirectLogoutUrl}`;
    router.push(authorizeEndpoint);
}