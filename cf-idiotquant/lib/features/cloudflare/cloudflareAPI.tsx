import { getCookie } from "@/components/util";
import { StarredStock, UserInfo } from "./cloudflareSlice";

export const getUserInfo: any = async () => {
    const authToken = getCookie("authToken");
    // console.log(`[setLoginStatus] authToken:`, authToken);

    const url = `${process.env.NEXT_PUBLIC_API_URL}/user/info`
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

    const url = `${process.env.NEXT_PUBLIC_API_URL}/user/info`
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

export const getStarredStocks: any = async () => {
    const authToken = getCookie("authToken");
    // console.log(`[setLoginStatus] authToken:`, authToken);

    const url = `${process.env.NEXT_PUBLIC_API_URL}/user/starred-stocks`
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

export const setStarredStocks: any = async (starredStocks: StarredStock[]) => {
    const authToken = getCookie("authToken");
    // console.log(`[setLoginStatus] authToken:`, authToken);

    const url = `${process.env.NEXT_PUBLIC_API_URL}/user/starred-stocks`
    const options: RequestInit = {
        method: "POST", // GET -> OPTION -> POST
        credentials: "include",  // include credentials (like cookies) in the request
        headers: {
            "content-type": "application/json; utf-8",
            // ...additionalHeaders,
            "authToken": authToken,
        },
        body: JSON.stringify(starredStocks)
    };
    // const res = await fetch(url, options);
    const res = await fetch(url, options);

    return res.json();
}
