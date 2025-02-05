
export const postWebSocketApi: any = async () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/oauth/approval`;
    const options: RequestInit = {
        method: "POST",
        credentials: "include",  // include credentials (like cookies) in the request
        headers: {
            "content-type": "application/json; utf-8",
        },
    };
    const res = await fetch(url, options);
    console.log(`[postWebSocketApi] res`, res, typeof res);
    // const json = res.json();
    // console.log(`[postWebSocketApi] json`, json, typeof json);

    // return textPromise1;
    return res.json();
}