import { getCookie } from "@/components/util";

export const postTimestamp: any = async (data: any) => {
    const authToken = getCookie("authToken");
    // console.log(`[setLoginStatus] authToken:`, authToken);

    const url = `${process.env.NEXT_PUBLIC_API_URL}/timestamp`
    const options: RequestInit = {
        method: "POST", // GET -> OPTION -> POST
        credentials: "include",  // include credentials (like cookies) in the request
        headers: {
            "content-type": "application/json; utf-8",
            // ...additionalHeaders,
            "authToken": authToken,
        },
        body: JSON.stringify(data)
    };
    // const res = await fetch(url, options);
    const res = await fetch(url, options);

    return res.json();
}

export const getTimestampList: any = async (count: string) => {
    const authToken = getCookie("authToken");
    // console.log(`[setLoginStatus] authToken:`, authToken);

    const url = `${process.env.NEXT_PUBLIC_API_URL}/timestamp`
    const options: RequestInit = {
        method: "GET", // GET -> OPTION -> POST
        credentials: "include",  // include credentials (like cookies) in the request
        headers: {
            "content-type": "application/json; utf-8",
            // ...additionalHeaders,
            "authToken": authToken,
            "count": count,
        },
    };
    // const res = await fetch(url, options);
    const res = await fetch(url, options);

    return res.json();
}
