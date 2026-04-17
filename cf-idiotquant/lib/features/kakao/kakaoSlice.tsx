import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getKakaoMemberList } from "./kakaoAPI";

interface KakaoAccountProfile {
    is_default_image: boolean;
    is_default_nickname: boolean;
    nickname: string;
    profile_image_url: string;
    thumbnail_image_url: string;
}

// NOTE: kakao 에서 받아오는 정보다 달라질 경우, redux 정상동작하지 않을 수 있습니다.
export interface KakaoAccount {

    email: string;
    email_needs_agreement: boolean;
    has_email: boolean;
    is_email_valid: boolean;
    is_email_verified: boolean;
    profile: KakaoAccountProfile;
    profile_image_needs_agreement: boolean;
    profile_nickname_needs_agreement: boolean;
}

interface KakaoProperties {
    nickname: string;
    profile_image: string;
    thumbnail_image: string;
}

export interface KakaoTotal {
    access_token: string;
    access_date: string;
    connected_at: string; // 최초 연동일
    expires_in: number;
    id: number;
    kakao_account: KakaoAccount;
    properties: KakaoProperties;
    refresh_token: string;
    refresh_token_expires_in: number;
    scope: string;
    token_type: string;
}

interface KakaoMemberList {
    state: "init" | "pending" | "fulfilled" | "rejected";
    list: any;
}

interface KakaoInfo {
    state: "init" | "pending" | "fulfilled" | "rejected";
    kakaoTotal: KakaoTotal;
    kakaoMemberList: KakaoMemberList;
}

const initialState: KakaoInfo = {
    state: "init",
    kakaoTotal: {
        access_token: "", // string;
        access_date: "", // string;
        connected_at: "", // string; // 최초 연동일
        expires_in: 0, // number;
        id: 0, // number;
        kakao_account: {
            email: "",
            email_needs_agreement: false,
            has_email: false,
            is_email_valid: false,
            is_email_verified: false,
            profile: {
                is_default_image: false, // boolean;
                is_default_nickname: false, // boolean;
                nickname: "", // string;
                profile_image_url: "", // string;
                thumbnail_image_url: "", // string;
            }, // KakaoAccountProfile;
            profile_image_needs_agreement: false, // boolean;
            profile_nickname_needs_agreement: false,
        }, // KakaoAccount;
        properties: {
            nickname: "",// string;
            profile_image: "",// string;
            thumbnail_image: "",// string;
        }, // KakaoProperties;
        refresh_token: "", // string;
        refresh_token_expires_in: 0, // number;
        scope: "", // string;
        token_type: "", // string;
    },
    kakaoMemberList: {
        state: "init",
        list: ""
    }
}

export const kakaoSlice = createAppSlice({
    name: "kakao",
    initialState,
    reducers: (create) => ({
        setKakaoStatePending: create.reducer((state) => {
            // console.log(`[setKakaoStatePending]`);
            state.state = "pending";
        }),
        setKakaoTotal: create.reducer((state, action: PayloadAction<KakaoTotal>) => {
            // console.log(`[setKakaoAccount] typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
            state.kakaoTotal = action.payload;
            state.state = "fulfilled";
        }),
        reqGetKakaoMemberList: create.asyncThunk(
            async () => {
                return await getKakaoMemberList();
            },
            {
                pending: (state) => {
                    // console.log(`[getKakaoMemberList] pending`);
                    state.kakaoMemberList.state = "pending"
                },
                fulfilled: (state, action) => {
                    // console.log(`[getKakaoMemberList] fulfilled`, `, typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
                    // NOTE: get cookie (cf_token)
                    state.kakaoMemberList.list = action.payload;
                    state.kakaoMemberList.state = "fulfilled";
                },
                rejected: (state) => {
                    // console.log(`[getKakaoMemberList] rejected`);
                    state.state = "rejected"
                }
            }
        ),
    }),
    selectors: {
        selectKakaoTotal: (state) => state.kakaoTotal,
        selectKakaoTatalState: (state) => state.state,
        selectKakaoMemberList: (state) => state.kakaoMemberList,
    }
});

export const { setKakaoTotal, setKakaoStatePending, reqGetKakaoMemberList } = kakaoSlice.actions;
export const { selectKakaoTotal, selectKakaoTatalState, selectKakaoMemberList } = kakaoSlice.selectors;
