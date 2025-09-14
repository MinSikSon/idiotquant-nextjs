import { getCookie } from "@/components/util";

export const getLoginStatus: any = async () => {
    const authToken = getCookie("authToken");
    // console.log(`[getLoginStatus] authToken:`, authToken);

    const url = `${process.env.NEXT_PUBLIC_API_URL}/login`
    const options: RequestInit = {
        method: "POST", // GET -> OPTION -> POST
        credentials: "include",  // include credentials (like cookies) in the request
        headers: {
            "content-type": "application/json; utf-8",
            // ...additionalHeaders,
            "authToken": authToken,
        },
        body: JSON.stringify({})
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

// export const postOrderCash: any = async (koreaInvestmentToken: KoreaInvestmentToken, PDNO: string, buyOrSell: string) => {
//     const subUrl = `/uapi/domestic-stock/v1/trading/order-cash`;
//     const additionalHeaders: AdditionalHeaders = {
//         "authorization": koreaInvestmentToken["access_token"],
//         "kakaoId": getCookie("kakaoId"),
//         "PDNO": PDNO,
//         "buyOrSell": buyOrSell,
//     }
//     return postKoreaInvestmentRequest(subUrl, additionalHeaders);
// }

// export async function postKoreaInvestmentRequest(subUrl: string, additionalHeaders?: AdditionalHeaders) {
//     const url = `${process.env.NEXT_PUBLIC_API_URL}${subUrl}`;
//     const options: RequestInit = {
//         method: "POST",
//         credentials: "include",  // include credentials (like cookies) in the request
//         headers: {
//             "content-type": "application/json; utf-8",
//             ...additionalHeaders
//         },
//     };
//     const res = await fetch(url, options);

//     return res.json();
// }