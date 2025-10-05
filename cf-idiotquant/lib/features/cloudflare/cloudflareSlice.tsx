import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getStarredStocks, getUserInfo, setStarredStocks, setUserInfo } from "./cloudflareAPI";

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

export interface StarredStock {
    name: string;
    date: string;
    isFavorite: boolean;
}
export interface StarredStocks {
    state: "init"
    | "pending" | "fulfilled" | "rejected" | "updating" | "updated" | "update-rejected"
    ;
    starredStock: StarredStock[];
}

interface cloudflareInfo {
    state: "init"
    | "pending" | "fulfilled" | "rejected" | "updating" | "updated" | "update-rejected"
    ;
    userInfo: UserInfo;
    starredStocks: StarredStocks;
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
    },
    starredStocks: {
        state: "init",
        starredStock: []
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
                    // console.log(`[getCloudFlareUserInfo] pending`);
                    state.userInfo.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[getCloudFlareUserInfo] fulfilled`, `typeof action.payload:`, typeof action.payload, `action.payload:`, action.payload);
                    state.userInfo = action.payload;
                    state.userInfo.state = "fulfilled";
                },
                rejected: (state) => {
                    // console.log(`[getCloudFlareUserInfo] rejected`);
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
                    // console.log(`[setCloudFlareUserInfo] updating`);
                    state.userInfo.state = "updating"
                },
                fulfilled: (state, action) => {
                    // console.log(`[setCloudFlareUserInfo] updated`, `typeof action.payload:`, typeof action.payload, `action.payload:`, action.payload);
                    state.userInfo.state = "updated";
                    // state.id = action.payload['id'];
                    // state.nickName = action.payload['name'];
                    // state.info = action.payload['info'];
                },
                rejected: (state) => {
                    // console.log(`[setCloudFlareUserInfo] update-rejected`);
                    state.userInfo.state = "update-rejected"
                }
            }
        ),
        getCloudFlareStarredStocks: create.asyncThunk(
            async () => {
                return await getStarredStocks();
            },
            {
                pending: (state) => {
                    // console.log(`[getStarredStocks] pending`);
                    state.starredStocks.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[getStarredStocks] fulfilled`, `typeof action.payload:`, typeof action.payload, `action.payload:`, action.payload);
                    if (action.payload.msg && "need kakao login" == action.payload.msg) {
                        state.starredStocks.state = "rejected";
                    }
                    else {
                        state.starredStocks = { ...state.starredStocks, state: "fulfilled", starredStock: action.payload };
                    }
                },
                rejected: (state) => {
                    // console.log(`[getStarredStocks] rejected`);
                    state.starredStocks.state = "rejected";
                }
            }
        ),
        setCloudFlareStarredStocks: create.asyncThunk(
            async ({ starredStocks }: { starredStocks: StarredStock[] }) => {
                return await setStarredStocks(starredStocks);
            },
            {
                pending: (state) => {
                    // console.log(`[setCloudFlareStarredStocks] pending`);
                    state.starredStocks.state = "pending"
                },
                fulfilled: (state, action) => {
                    // console.log(`[setCloudFlareStarredStocks] fulfilled`, `typeof action.payload:`, typeof action.payload, `action.payload:`, action.payload);
                    if (action.payload.msg && "need kakao login" == action.payload.msg) {
                        state.starredStocks.state = "rejected";
                    }
                    else {
                        state.starredStocks = { ...state.starredStocks, state: "fulfilled", starredStock: action.payload };
                    }
                    // state.id = action.payload['id'];
                    // state.nickName = action.payload['name'];
                    // state.info = action.payload['info'];
                },
                rejected: (state) => {
                    // console.log(`[setCloudFlareStarredStocks] rejected`);
                    state.starredStocks.state = "rejected"
                }
            }
        ),
    }),
    selectors: {
        selectCloudflareUserInfo: (state) => state.userInfo,
        selectCloudflareStarredStocks: (state) => state.starredStocks,
    }
});

export const { setCloudFlareUserInfo, getCloudFlareUserInfo, setCloudFlareStarredStocks, getCloudFlareStarredStocks } = cloudflareSlice.actions;
export const { selectCloudflareUserInfo, selectCloudflareStarredStocks } = cloudflareSlice.selectors;
