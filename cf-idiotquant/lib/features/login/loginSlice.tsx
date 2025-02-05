import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getLoginStatus } from "./loginAPI";

interface LoginInfo {
    state: "init"
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
                const res = await getLoginStatus();
                console.log(`[getCloudFlareLoginStatus] res`, res);
                return res;
            },
            {
                pending: (state) => {
                    // console.log(`[getCloudFlareLoginStatus] pending`);
                },
                fulfilled: (state, action) => {
                    console.log(`[getCloudFlareLoginStatus] fulfilled`);
                    // console.log(`action.payload`, action.payload);
                    const id = action.payload['id'];
                    const name = action.payload['name'];
                    // console.log(`typeof action.payload`, typeof action.payload);
                    state.state = "cf";
                    state.id = id;
                    state.nickName = name;
                },
                rejected: (state) => {
                    console.log(`[getCloudFlareLoginStatus] get-rejected 2`);
                }
            }
        ),
    }),
    selectors: {
        selectKakaoAuthCode: (state) => state.kakaoAuthCode,
        selectKakaoNickName: (state) => state.nickName,
        selectKakaoId: (state) => state.id,
    }
});

export const { setKakaoAuthCode, setKakaoNickName, setKakaoId, getCloudFlareLoginStatus } = loginSlice.actions;
export const { selectKakaoAuthCode, selectKakaoNickName, selectKakaoId } = loginSlice.selectors;
