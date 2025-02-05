import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { postWebSocketApi } from "./koreaInvestmentAPI";

interface KoreaInvestmentInfo {
    state: "init"
    | "get-rejected"
    | "loading" | "loaded" | "rejected"
    | "kis";
    id: string;
    nickName: string;
    approval_key: string;
}
const initialState: KoreaInvestmentInfo = {
    state: "init",
    id: "",
    nickName: "",
    approval_key: ""
}
export const koreaInvestmentSlice = createAppSlice({
    name: "koreaInvestment",
    initialState,
    reducers: (create) => ({
        postWebSocket: create.asyncThunk(
            async () => {
                return await postWebSocketApi();
            },
            {
                pending: (state) => {
                    console.log(`[postWebSocket] pending`);
                },
                fulfilled: (state, action) => {
                    console.log(`[postWebSocket] action.payload`, action.payload);
                    console.log(`typeof action.payload`, typeof action.payload);
                    const approval_key = JSON.parse(action.payload)["approval_key"];
                    console.log(`approval_key`, approval_key);
                    state.approval_key = approval_key;
                    state.state = "kis";
                },
                rejected: (state) => {
                    console.log(`[postWebSocket] get-rejected 2`);
                },
                settled: (state) => {
                    console.log(`[postWebSocket] settled`);
                },
            }
        ),
    }),
    selectors: {
        // selectKakaoAuthCode: (state) => state.kakaoAuthCode,
        // selectKakaoNickName: (state) => state.nickName,
        // selectKakaoId: (state) => state.id,
    }
});

export const { postWebSocket } = koreaInvestmentSlice.actions;
