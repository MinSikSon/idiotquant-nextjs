
export const getLoginStatus: any = async () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/login`
    const options: RequestInit = {
        method: 'GET',
        credentials: 'include',  // include credentials (like cookies) in the request
        headers: {
            "content-type": "application/json; utf-8",
            // ...additionalHeaders,
        },
    };
    // const res = await fetch(url, options);
    const res = await fetch(url, options);
    // console.log(`[getFinancialInfoList] res`, res);

    return res.json();
}