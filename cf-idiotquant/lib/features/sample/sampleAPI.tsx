import { getCookie } from "@/components/util";

export const postSample: any = async (data: any) => {
    // console.log(`[setLoginStatus] authToken:`, authToken);

    const url = `/api/proxy/sample/`
    const options: RequestInit = {
        method: "POST", // GET -> OPTION -> POST
        credentials: "include",  // include credentials (like cookies) in the request
        headers: {
            "content-type": "application/json; utf-8",
            // ...additionalHeaders,
        },
        body: JSON.stringify(data)
    };
    // const res = await fetch(url, options);
    const res = await fetch(url, options);

    return res.json();
}

export const getSample: any = async (count: string) => {
    // console.log(`[setLoginStatus] authToken:`, authToken);

    const url = `/api/proxy/sample/`
    const options: RequestInit = {
        method: "GET", // GET -> OPTION -> POST
        credentials: "include",  // include credentials (like cookies) in the request
        headers: {
            "content-type": "application/json; utf-8",
            // ...additionalHeaders,
            "count": count,
        },
    };
    // const res = await fetch(url, options);
    const res = await fetch(url, options);

    return res.json();
}
