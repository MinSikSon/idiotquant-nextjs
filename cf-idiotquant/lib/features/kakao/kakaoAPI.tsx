import { getCookie } from "@/components/util";
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


export const getKakaoMemberList: any = async () => {
    const authToken = getCookie("authToken");

    const url = `/api/proxy/kakao/member/list`
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