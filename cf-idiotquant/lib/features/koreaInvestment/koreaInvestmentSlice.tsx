import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getInquireBalanceApi, postTokenApi, postWebSocketApi } from "./koreaInvestmentAPI";

interface KoreaInvestmentApproval {
    approval_key: string;
}
export interface KoreaInvestmentToken {
    // NOTE: 분당 1회 발급 가능
    access_token: string;
    access_token_token_expired: string;
    token_type: string;
    expires_in: number;
    // {
    //     "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ0b2tlbiIsImF1ZCI6IjJkOGQxMWIxLTMxYjItNDk0MC1hOTYxLTRlZDE5NGIwNjlkZSIsInByZHRfY2QiOiIiLCJpc3MiOiJ1bm9ndyIsImV4cCI6MTczODkwNjc1MCwiaWF0IjoxNzM4ODIwMzUwLCJqdGkiOiJQUzc3VU1LMHNmNnp2ZURzMzVtQzJlaVZEOVAzcHZzR21ybHgifQ.Bb3NAHnOC6xQ-Opejm9qLbcHmlr8b3fdVni38Y1GyHwZSyqwZRAPfew26bAeh5OEqWK6tsfVKvZE6iUq3yw4Qg",
    //         "access_token_token_expired": "2025-02-07 14:39:10",
    //             "token_type": "Bearer",
    //                 "expires_in": 86400
    // }
}
interface KoreaInvestmentInfo {
    state: "init"
    | "get-rejected"
    | "loading" | "loaded" | "rejected"
    | "approval"
    | "token"
    | "inquire-balance"
    ;
    id: string;
    nickName: string;
    koreaInvestmentApproval: KoreaInvestmentApproval;
    koreaInvestmentToken: KoreaInvestmentToken;
}
const initialState: KoreaInvestmentInfo = {
    state: "init",
    id: "",
    nickName: "",
    koreaInvestmentApproval: {
        approval_key: ""
    },
    koreaInvestmentToken: {
        access_token: "",
        access_token_token_expired: "",
        token_type: "",
        expires_in: 0
    }
}
export const koreaInvestmentSlice = createAppSlice({
    name: "koreaInvestment",
    initialState,
    reducers: (create) => ({
        reqPostWebSocket: create.asyncThunk(
            async () => {
                const res = await postWebSocketApi();
                if (null == res) {
                    return;
                }
                return res;
            },
            {
                pending: (state) => {
                    // console.log(`[postWebSocket] pending`);
                },
                fulfilled: (state, action) => {
                    // console.log(`[postWebSocket] action.payload`, action.payload);
                    const json = JSON.parse(action.payload);
                    console.log(`json["approval_key"]`, json["approval_key"]);
                    state.koreaInvestmentApproval.approval_key = json["approval_key"];
                    state.state = "approval";
                },
                rejected: (state) => {
                    console.log(`[postWebSocket] get-rejected 2`);
                },
            }
        ),
        setKoreaInvestmentToken: create.reducer((state, action: PayloadAction<KoreaInvestmentToken>) => {
            console.log(`[postToken] action.payload`, action.payload);
            const json = action.payload;
            state.koreaInvestmentToken.access_token = json["access_token"];
            state.koreaInvestmentToken.access_token_token_expired = json["access_token_token_expired"];
            state.koreaInvestmentToken.token_type = json["token_type"];
            state.koreaInvestmentToken.expires_in = json["expires_in"];
        }),
        reqPostToken: create.asyncThunk(
            async () => {
                return await postTokenApi();
            },
            {
                pending: (state) => {
                    // console.log(`[postWebSocket] pending`);
                },
                fulfilled: (state, action) => {
                    console.log(`[postToken] action.payload`, action.payload);
                    const json = JSON.parse(action.payload);
                    state.koreaInvestmentToken.access_token = json["access_token"];
                    state.koreaInvestmentToken.access_token_token_expired = json["access_token_token_expired"];
                    state.koreaInvestmentToken.token_type = json["token_type"];
                    state.koreaInvestmentToken.expires_in = json["expires_in"];

                    localStorage.setItem('koreaInvestmentToken', JSON.stringify(json));

                    state.state = "token";
                },
                rejected: (state) => {
                    console.log(`[postWebSocket] get-rejected 2`);
                },
            }
        ),
        reqGetInquireBalance: create.asyncThunk(
            async (koreaInvestmentToken: KoreaInvestmentToken) => {
                return await getInquireBalanceApi(koreaInvestmentToken);
            },
            {
                pending: (state) => {
                    // console.log(`[postWebSocket] pending`);
                },
                fulfilled: (state, action) => {
                    console.log(`[getInquireBalance] action.payload`, action.payload, typeof action.payload);
                    const json = JSON.parse(action.payload);
                    // state.koreaInvestmentToken.access_token = json["access_token"];
                    // state.koreaInvestmentToken.access_token_token_expired = json["access_token_token_expired"];
                    // state.koreaInvestmentToken.token_type = json["token_type"];
                    // state.koreaInvestmentToken.expires_in = json["expires_in"];
                    state.state = "inquire-balance";
                },
                rejected: (state) => {
                    console.log(`[postWebSocket] get-rejected 2`);
                },
            }
        ),
    }),
    selectors: {
        getKoreaInvestmentApproval: (state) => state.koreaInvestmentApproval,
        getKoreaInvestmentToken: (state) => state.koreaInvestmentToken,
    }
});

export const { reqPostWebSocket, reqPostToken, reqGetInquireBalance } = koreaInvestmentSlice.actions;
export const { setKoreaInvestmentToken } = koreaInvestmentSlice.actions;
export const { getKoreaInvestmentApproval, getKoreaInvestmentToken } = koreaInvestmentSlice.selectors;
