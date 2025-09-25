import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getUserInfo, setLoginStatus, setLogoutStatus, setUserInfo } from "./loginAPI";

export interface UserInfo {
    state: "init"
    | "pending" | "fulfilled" | "rejected" | "updating" | "updated" | "update-rejected"
    ;
    nickname: string;
    email?: string;
    avatarUrl?: string;
    joinedAt: number;
    lastLoginAt: number;
    desc: string;
    point: number;
}

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
    userInfo: UserInfo;
}

const initialState: LoginInfo = {
    state: "init",
    id: "",
    nickName: "",
    kakaoAuthCode: "",
    userInfo: {
        state: "init",
        nickname: "",
        joinedAt: 0,
        lastLoginAt: 0,
        desc: "",
        point: 0,
    }
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
        setCloudFlareLoginStatus: create.asyncThunk(
            async () => {
                return await setLoginStatus();
            },
            {
                pending: (state) => {
                    console.log(`[setCloudFlareLoginStatus] pending`);
                    state.state = "pending"
                },
                fulfilled: (state, action) => {
                    console.log(`[setCloudFlareLoginStatus] fulfilled`, `, typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
                    // NOTE: get cookie (cf_token)
                    const msg = action.payload.msg;
                    // if ("need kakao login" == info.msg) {
                    if ("need kakao login" == msg) {

                    }
                    else {
                        state.state = "cf";
                    }
                },
                rejected: (state) => {
                    console.log(`[setCloudFlareLoginStatus] rejected`);
                    state.state = "rejected"
                }
            }
        ),
        setCloudFlareLogoutStatus: create.asyncThunk(
            async () => {
                return await setLogoutStatus();
            },
            {
                pending: (state) => {
                    console.log(`[setCloudFlareLogoutStatus] pending`);
                    state.state = "pending"
                },
                fulfilled: (state, action) => {
                    console.log(`[setCloudFlareLogoutStatus] fulfilled`, `typeof action.payload:`, typeof action.payload, `action.payload:`, action.payload);
                    state.state = "cf";
                    // state.id = action.payload['id'];
                    // state.nickName = action.payload['name'];
                    // state.info = action.payload['info'];
                },
                rejected: (state) => {
                    console.log(`[setCloudFlareLogoutStatus] rejected`);
                    state.state = "rejected"
                }
            }
        ),
        getCloudFlareUserInfo: create.asyncThunk(
            async () => {
                return await getUserInfo();
            },
            {
                pending: (state) => {
                    console.log(`[getCloudFlareUserInfo] pending`);
                    state.userInfo.state = "pending"
                },
                fulfilled: (state, action) => {
                    console.log(`[getCloudFlareUserInfo] fulfilled`, `typeof action.payload:`, typeof action.payload, `action.payload:`, action.payload);
                    // state.id = action.payload['id'];
                    // state.nickName = action.payload['name'];
                    // state.info = action.payload['info'];
                    state.userInfo = { ...state.userInfo, ...action.payload };
                    state.userInfo.state = "fulfilled";
                },
                rejected: (state) => {
                    console.log(`[getCloudFlareUserInfo] rejected`);
                    state.userInfo.state = "rejected"
                }
            }
        ),
        setCloudFlareUserInfo: create.asyncThunk(
            async (userInfo: UserInfo) => {
                return await setUserInfo(userInfo);
            },
            {
                pending: (state) => {
                    console.log(`[setCloudFlareUserInfo] updating`);
                    state.userInfo.state = "updating"
                },
                fulfilled: (state, action) => {
                    console.log(`[setCloudFlareUserInfo] updated`, `typeof action.payload:`, typeof action.payload, `action.payload:`, action.payload);
                    state.userInfo.state = "updated";
                    // state.id = action.payload['id'];
                    // state.nickName = action.payload['name'];
                    // state.info = action.payload['info'];
                },
                rejected: (state) => {
                    console.log(`[setCloudFlareUserInfo] update-rejected`);
                    state.userInfo.state = "update-rejected"
                }
            }
        ),
    }),
    selectors: {
        selectKakaoAuthCode: (state) => state.kakaoAuthCode,
        selectKakaoNickName: (state) => state.nickName,
        selectKakaoId: (state) => state.id,
        selectLoginState: (state) => state.state,
        selectUserInfo: (state) => state.userInfo,
    }
});

export const { setKakaoAuthCode, setKakaoNickName, setKakaoId, setCloudFlareLoginStatus, getCloudFlareUserInfo, setCloudFlareUserInfo } = loginSlice.actions;
export const { selectKakaoAuthCode, selectKakaoNickName, selectKakaoId, selectLoginState, selectUserInfo } = loginSlice.selectors;
