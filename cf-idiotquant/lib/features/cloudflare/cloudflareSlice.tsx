import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getUserInfo, setUserInfo } from "./cloudflareAPI";

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
interface cloudflareInfo {
    state: "init"
    | "pending" | "fulfilled" | "rejected" | "updating" | "updated" | "update-rejected"
    ;
    userInfo: UserInfo;
}

const initialState: cloudflareInfo = {
    state: "init",
    userInfo: {
        state: "init",
        nickname: "",
        joinedAt: 0,
        lastLoginAt: 0,
        desc: "",
        point: 0
    }
}

export const cloudflareSlice = createAppSlice({
    name: "cloudflare",
    initialState,
    reducers: (create) => ({
        getCloudFlareUserInfo: create.asyncThunk(
            async () => {
                return await getUserInfo();
            },
            {
                pending: (state) => {
                    console.log(`[getCloudFlareUserInfo] pending`);
                    state.userInfo.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[getCloudFlareUserInfo] fulfilled`, `typeof action.payload:`, typeof action.payload, `action.payload:`, action.payload);
                    // state.id = action.payload['id'];
                    // state.nickName = action.payload['name'];
                    // state.info = action.payload['info'];
                    state.userInfo = action.payload;
                    state.userInfo.state = "fulfilled";
                },
                rejected: (state) => {
                    console.log(`[getCloudFlareUserInfo] rejected`);
                    state.userInfo.state = "rejected";
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
        selectCloudflare: (state) => state.userInfo,
    }
});

export const { setCloudFlareUserInfo, getCloudFlareUserInfo } = cloudflareSlice.actions;
export const { selectCloudflare } = cloudflareSlice.selectors;
