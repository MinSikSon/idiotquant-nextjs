import { clearCookie } from "@/components/util";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

const DEBUG = false;

export function Logout(router: AppRouterInstance, redirectLogoutUrl: string) {

    if (DEBUG) console.log(`Logout`);
    clearCookie("authToken");
    clearCookie("koreaInvestmentToken");

    const authorizeEndpoint = `https://kauth.kakao.com/oauth/logout?client_id=${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}&logout_redirect_uri=${redirectLogoutUrl}`;
    router.push(authorizeEndpoint);
}