
import { getCookie } from "@/components/util";

interface AiHeaders {
    authorization?: string;
    kakaoId?: string;
    system_content: string;
    user_content: string;
}

export const postLaboratory: any = async (system_content: string, user_content: string) => {
    const subUrl = `/laboratory`;
    const additionalHeaders: AiHeaders = {
        // "authorization": koreaInvestmentToken["access_token"],
        "kakaoId": getCookie("kakaoId"),
        "system_content": system_content,
        "user_content": user_content,
    }
    return postAiRequest(subUrl, additionalHeaders);
}

async function postAiRequest(subUrl: string, additionalHeaders?: AiHeaders) {
    const url = `${process.env.NEXT_PUBLIC_API_URL}${subUrl}`;
    const options: RequestInit = {
        method: "POST",
        credentials: "include",  // include credentials (like cookies) in the request
        headers: {
            "content-type": "application/json; utf-8",
            ...additionalHeaders,
        },
    };
    const res = await fetch(url, options);
    return res.json();
}
