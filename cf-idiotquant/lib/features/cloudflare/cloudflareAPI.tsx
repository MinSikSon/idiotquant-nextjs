import { getCookie } from "@/components/util";
import { UserInfo } from "./cloudflareSlice";

export const getUserInfo: any = async () => {
    const authToken = getCookie("authToken");
    // console.log(`[setLoginStatus] authToken:`, authToken);

    const url = `${process.env.NEXT_PUBLIC_API_URL}/user-info`
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

    const url = `${process.env.NEXT_PUBLIC_API_URL}/user-info`
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