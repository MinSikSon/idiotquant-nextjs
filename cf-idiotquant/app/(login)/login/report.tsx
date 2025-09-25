"use client";

import { useEffect, useState } from "react";
import { KakaoAccount, KakaoMessage, KakaoTotal, selectKakaoTotal, setKakaoMessage } from "@/lib/features/login/loginSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button } from "@material-tailwind/react";
import Auth from "@/components/auth";
import { isValidCookie } from "@/components/util";
import { getKoreaInvestmentBalance, getKoreaInvestmentToken, KoreaInvestmentBalance, KoreaInvestmentToken, reqGetInquireBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";

const DEBUG = true;

export default function Report() {
    const dispatch = useAppDispatch();

    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
    const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);
    const kakaoTotal: KakaoTotal = useAppSelector(selectKakaoTotal);

    const [message, setMessage] = useState<KakaoMessage>({} as KakaoMessage);
    const [validCookie, setValidCookie] = useState<any>(false);
    useEffect(() => {
        setValidCookie(isValidCookie("koreaInvestmentToken"));
    }, []);
    useEffect(() => {
        if (DEBUG) console.log(`[Report] message`, message);
    }, [message]);

    useEffect(() => {
        const isValidKiAccessToken = !!kiToken["access_token"];
        if (DEBUG) console.log(`[Report]`, `isValidKiAccessToken`, isValidKiAccessToken);
        if (true == isValidKiAccessToken) {
            dispatch(reqGetInquireBalance(kiToken));
        }

    }, [kiToken]);
    // useEffect(() => {
    //     if (true == DEBUG) console.log(`[Report]`, `kiBalance`, kiBalance);
    // }, [kiBalance]);

    useEffect(() => {
        if (true == DEBUG) console.log(`[Report]`, `kiBalance`, kiBalance);
        if (true == DEBUG) console.log(`[Report]`, `kakaoTotal`, kakaoTotal);

        const newMessage: KakaoMessage = {
            object_type: "feed",
            content: {
                title: "골든 리트리버",
                description: "강아지, 골댕이, 멍멍이",
                image_url: "https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcQ8PwlYqDGozO1pGQfRbVXN0O5N036AFzK8CtVJ1mya3u6xj_9ChpHQBsSWA6hboAyIssBaROErkwuv7E25GIRY2V6a--8sD-0CcO_LBoF-",
                image_width: 640,
                image_height: 640,
                link: {
                    web_url: "http://www.daum.net",
                    mobile_web_url: "http://m.daum.net",
                    android_execution_params: "contentId=100",
                    ios_execution_params: "contentId=100"
                }
            },
            item_content: {
                profile_text: `${kakaoTotal?.kakao_account?.profile?.nickname}님 오늘의 리포트 입니다.`,
                profile_image_url: "https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcQC204t6uH7yxBhAKuLIDmnkoH889H4CltDoKCyx62wGyv0n1hVglreFD0DYT3evs4GNc0xxVGM2dVnyPoa4LNBmlNoS8y44LtHmIRUUk7C",
                title_image_url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ7fzLDFYamWLTE46n73joaDbqcOEV8WS1lfg&s",
                title_image_text: "Golden Retriever",
                title_image_category: "Retriever",
                items: [
                    { item: "Cake1", item_op: "1000원" },
                    { item: "Cake2", item_op: "2000원" },
                    { item: "Cake3", item_op: "3000원" },
                    { item: "Cake4", item_op: "4000원" },
                    { item: "Cake5", item_op: "5000원" }
                ],
                sum: "Total",
                sum_op: "15000원"
            },
            // social: {
            //     like_count: 100,
            //     comment_count: 200,
            //     shared_count: 300,
            //     view_count: 400,
            //     subscriber_count: 500
            // },
            // buttons: [
            //     {
            //         title: "웹으로 이동",
            //         link: {
            //             web_url: "http://www.daum.net",
            //             mobile_web_url: "http://m.daum.net"
            //         }
            //     },
            //     {
            //         title: "앱으로 이동",
            //         link: {
            //             android_execution_params: "contentId=100",
            //             ios_execution_params: "contentId=100"
            //         }
            //     }
            // ]
        };
        setMessage(newMessage);
    }, [kiBalance, kakaoTotal]);

    if (false == validCookie || false == !!kiToken["access_token"]) {
        return <>
            <Auth />
            <div className="dark:bg-black h-lvh"></div>
        </>
    }

    function onClick() {
        if (DEBUG) console.log(`[Report] setKakaoMessage`);
        if (DEBUG) console.log(`[Report] message:`, message);

        dispatch(setKakaoMessage(message));
    }

    return <>
        <div className="flex flex-col dark:bg-black h-fit justify-center items-center">
            <span className="text-gray-500">Report page is under construction...</span>
            <Button onClick={onClick}>testSendKakaoMessage</Button>
        </div>
    </>
}