import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getLoginStatus } from "./loginAPI";

interface LoginInfo {
    state: "init"
    | "pending"
    | "get-rejected"
    | "loading" | "loaded" | "rejected"
    | "kakao"
    | "cf";
    id: string;
    nickName: string;
    kakaoAuthCode: string;
}
const initialState: LoginInfo = {
    state: "init",
    id: "",
    nickName: "",
    kakaoAuthCode: ""
}
export const loginSlice = createAppSlice({
    name: "login",
    initialState,
    reducers: (create) => ({
        setLoading: create.reducer((state) => {
            state.state = "loading";
        }),
        setKakaoAuthCode: create.reducer((state, action: PayloadAction<string>) => {
            state.state = "kakao";
            state.kakaoAuthCode = action.payload;
        }),
        setKakaoNickName: create.reducer((state, action: PayloadAction<string>) => {
            state.nickName = action.payload;
        }),
        setKakaoId: create.reducer((state, action: PayloadAction<string>) => {
            state.id = action.payload;
        }),
        getCloudFlareLoginStatus: create.asyncThunk(
            async () => {
                return await getLoginStatus();
            },
            {
                pending: (state) => {
                    // console.log(`[getCloudFlareLoginStatus] pending`);
                    state.state = "pending"
                },
                fulfilled: (state, action) => {
                    // console.log(`[getCloudFlareLoginStatus] fulfilled`, `typeof action.payload:`, typeof action.payload, `action.payload:`, action.payload);
                    state.state = "cf";
                    state.id = action.payload['id'];
                    state.nickName = action.payload['name'];
                },
                rejected: (state) => {
                    // console.log(`[getCloudFlareLoginStatus] rejected`);
                    state.state = "rejected"
                }
            }
        ),
    }),
    selectors: {
        selectKakaoAuthCode: (state) => state.kakaoAuthCode,
        selectKakaoNickName: (state) => state.nickName,
        selectKakaoId: (state) => state.id,
        selectLoginState: (state) => state.state,
    }
});

export const { setKakaoAuthCode, setKakaoNickName, setKakaoId, getCloudFlareLoginStatus } = loginSlice.actions;
export const { selectKakaoAuthCode, selectKakaoNickName, selectKakaoId, selectLoginState } = loginSlice.selectors;
