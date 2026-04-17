import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { postKakaoMessage, setLoginStatus, setLogoutStatus } from "./loginAPI";

interface KakaoMessageResponse {
    state: "init"
    | "pending" | "fulfilled" | "rejected"
    ;
    msg: any;
}

interface KakaoMessageContentLink {
    web_url: string; // "http://www.daum.net",
    mobile_web_url: string; // "http://m.daum.net",
    android_execution_params: string; // "contentId=100",
    ios_execution_params: string; // "contentId=100"
}
interface KakaoMessageContent {
    title: string; //	String	콘텐츠의 타이틀	O*
    image_url: string; //	String	콘텐츠의 이미지 URL	O*
    image_width: number; //	Int	콘텐츠의 이미지 너비, 픽셀 단위	X
    image_height: number; //	Int	콘텐츠의 이미지 높이, 픽셀 단위	X
    description: string; //	String	콘텐츠의 상세 설명, title과 합쳐 최대 4줄 표시	O*
    link: KakaoMessageContentLink; //	Link	콘텐츠 클릭 시 이동할 링크 정보	O
}

interface KakaoMessageItemContentItem {
    item: string; // "Cake1",
    item_op: string; // "1000원"
}
interface KakaoMessageItemContent {
    profile_text: string; // "Kakao",
    profile_image_url: string; // "https://mud-kage.kakao.com/dn/Q2iNx/btqgeRgV54P/VLdBs9cvyn8BJXB3o7N8UK/kakaolink40_original.png",
    title_image_url: string; // "https://mud-kage.kakao.com/dn/Q2iNx/btqgeRgV54P/VLdBs9cvyn8BJXB3o7N8UK/kakaolink40_original.png",
    title_image_text: string; // "Cheese cake",
    title_image_category: string; // "Cake",
    items: KakaoMessageItemContentItem[];
    sum: string; // "Total",
    sum_op: string; // "15000원"
}
interface KakaoMessageSocial {
    like_count: number; // 100,
    comment_count: number; // 200,
    shared_count: number; // 300,
    view_count: number; // 400,
    subscriber_count: number; // 500
}

interface KakaoMessageButton {
    title: string; // "웹으로 이동",
    link: {
        web_url?: string; // "http://www.daum.net",
        mobile_web_url?: string; // "http://m.daum.net"
        android_execution_params?: string; // "contentId=100",
        ios_execution_params?: string; // "contentId=100"
    }
}

export interface KakaoMessage {
    object_type: "feed";
    content: KakaoMessageContent;
    item_content: KakaoMessageItemContent;
    social?: KakaoMessageSocial;
    buttons: KakaoMessageButton[];
}

interface LoginInfo {
    state: "init"
    | "pending"
    | "get-rejected"
    | "loading" | "loaded" | "rejected"
    | "kakao"
    | "cf"
    | "cf-login"
    | "cf-need-retry"
    | "cf-logout";
    kakaoAuthCode: string;
    kakaoMessageResponse: KakaoMessageResponse;
}

const initialState: LoginInfo = {
    state: "init",
    kakaoAuthCode: "",
    kakaoMessageResponse: {
        state: "init",
        msg: ""
    }
}

export const loginSlice = createAppSlice({
    name: "login",
    initialState,
    reducers: (create) => ({
        setLoading: create.reducer((state) => {
            state.state = "loading";
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
                    if ("need kakao login" == msg) {
                        state.state = "cf-need-retry";
                    }
                    else {
                        state.state = "cf-login";
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
                    state.state = "cf-logout";
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
        setKakaoMessage: create.asyncThunk(
            async (kakaoMessage: KakaoMessage) => {
                return await postKakaoMessage(kakaoMessage);
            },
            {
                pending: (state) => {
                    console.log(`[postKakaoMessage] pending`);
                    state.kakaoMessageResponse.state = "pending"
                },
                fulfilled: (state, action) => {
                    console.log(`[postKakaoMessage] fulfilled`, `typeof action.payload:`, typeof action.payload, `action.payload:`, action.payload);
                    state.kakaoMessageResponse = { ...state.kakaoMessageResponse, state: "fulfilled", msg: action.payload }
                },
                rejected: (state) => {
                    console.log(`[postKakaoMessage] rejected`);
                    state.kakaoMessageResponse.state = "rejected"
                }
            }
        ),
    }),
    selectors: {
        selectKakaoAuthCode: (state) => state.kakaoAuthCode,
        selectLoginState: (state) => state.state,
    }
});

export const { setCloudFlareLoginStatus, setKakaoMessage } = loginSlice.actions;
export const { selectKakaoAuthCode, selectLoginState } = loginSlice.selectors;
