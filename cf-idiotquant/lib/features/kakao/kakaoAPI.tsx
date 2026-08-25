import { getCookie } from "@/lib/utils/cookies";
import { apiRequest } from "../apiRequest";
import { UserInfo } from "../cloudflare/cloudflareSlice";
import { KakaoMessage } from "../login/loginSlice";

export const setLoginStatus: any = async () => {
    const authToken = getCookie("authToken");
    // console.log(`[setLoginStatus] authToken:`, authToken);

    const url = `${process.env.NEXT_PUBLIC_API_URL}/login/`
    const options: RequestInit = {
        method: "POST", // GET -> OPTION -> POST
        credentials: "include",  // include credentials (like cookies) in the request
        headers: {
            "content-type": "application/json; utf-8",
            // ...additionalHeaders,
            "authToken": authToken,
        },
        // body: JSON.stringify({})
    };
    // const res = await fetch(url, options);
    const res = await fetch(url, options);

    return res.json();
}

export const setLogoutStatus: any = async (startList: string[]) => {
    const authToken = getCookie("authToken");
    console.log(`[setLogoutStatus]`);
    const url = `${process.env.NEXT_PUBLIC_API_URL}/logout`
    const additionalHeaders: any = {
        "startList": JSON.stringify(startList)
    }
    const options: RequestInit = {
        method: "POST",
        credentials: "include",  // include credentials (like cookies) in the request
        headers: {
            "content-type": "application/json; utf-8",
            ...additionalHeaders,
            "authToken": authToken,
        },
    };

    const res = await fetch(url, options);

    return res.json();
}

export const getUserInfo: any = async () => {
    const authToken = getCookie("authToken");
    // console.log(`[setLoginStatus] authToken:`, authToken);

    const url = `${process.env.NEXT_PUBLIC_API_URL}/user/info/`
    const options: RequestInit = {
        method: "GET", // GET -> OPTION -> POST
        credentials: "include",  // include credentials (like cookies) in the request
        headers: {
            "content-type": "application/json; utf-8",
            // ...additionalHeaders,
            "authToken": authToken,
        },
        // body: JSON.stringify({})
    };
    // const res = await fetch(url, options);
    const res = await fetch(url, options);

    return res.json();
}

export const setUserInfo: any = async (userInfo: UserInfo) => {
    const authToken = getCookie("authToken");
    // console.log(`[setLoginStatus] authToken:`, authToken);

    const url = `${process.env.NEXT_PUBLIC_API_URL}/user/info/`
    const options: RequestInit = {
        method: "POST", // GET -> OPTION -> POST
        credentials: "include",  // include credentials (like cookies) in the request
        headers: {
            "content-type": "application/json; utf-8",
            // ...additionalHeaders,
            "authToken": authToken,
        },
        body: JSON.stringify(userInfo)
    };
    // const res = await fetch(url, options);
    const res = await fetch(url, options);

    return res.json();
}

export const postKakaoMessage: any = async (kakaoMessage: KakaoMessage) => {
    const authToken = getCookie("authToken");
    // console.log(`[setLoginStatus] authToken:`, authToken);

    const url = `${process.env.NEXT_PUBLIC_API_URL}/kakao/message`
    const options: RequestInit = {
        method: "POST", // GET -> OPTION -> POST
        credentials: "include",  // include credentials (like cookies) in the request
        headers: {
            "content-type": "application/json; utf-8",
            // ...additionalHeaders,
            "authToken": authToken,
        },
        body: JSON.stringify(kakaoMessage)
    };
    // const res = await fetch(url, options);
    const res = await fetch(url, options);

    return res.json();
}


/* 이 파일에서 프록시를 거치는 유일한 호출이다. 위의 것들은 워커를 브라우저에서
   직접 부르고 authToken 쿠키로 인증하는 옛 경로라 apiRequest 로 옮기면 인증이 달라진다. */
export const getKakaoMemberList: any = () => apiRequest("/kakao/member/list");