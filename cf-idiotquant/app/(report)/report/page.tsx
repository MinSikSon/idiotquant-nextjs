"use client";

import { useEffect, useState } from "react";
import { KakaoMessage, setKakaoMessage } from "@/lib/features/login/loginSlice";
import { useAppDispatch } from "@/lib/hooks";
import { Button } from "@material-tailwind/react";

const DEBUG = true;

export default function Report() {
    const dispatch = useAppDispatch();

    const [message, setMessage] = useState<KakaoMessage>({} as KakaoMessage);
    function onClick() {
        if (DEBUG) console.log(`[Report] setKakaoMessage`);
        if (DEBUG) console.log(`[Report] message:`, message);

        dispatch(setKakaoMessage(message));
    }

    useEffect(() => {
        const newMessage: KakaoMessage = {
            object_type: "feed",
            content: {
                title: "오늘의 디저트",
                description: "아메리카노, 빵, 케익",
                image_url: "https://mud-kage.kakao.com/dn/NTmhS/btqfEUdFAUf/FjKzkZsnoeE4o19klTOVI1/openlink_640x640s.jpg",
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
                profile_text: "Kakao",
                profile_image_url: "https://mud-kage.kakao.com/dn/Q2iNx/btqgeRgV54P/VLdBs9cvyn8BJXB3o7N8UK/kakaolink40_original.png",
                title_image_url: "https://mud-kage.kakao.com/dn/Q2iNx/btqgeRgV54P/VLdBs9cvyn8BJXB3o7N8UK/kakaolink40_original.png",
                title_image_text: "Cheese cake",
                title_image_category: "Cake",
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
            social: {
                like_count: 100,
                comment_count: 200,
                shared_count: 300,
                view_count: 400,
                subscriber_count: 500
            },
            buttons: [
                {
                    title: "웹으로 이동",
                    link: {
                        web_url: "http://www.daum.net",
                        mobile_web_url: "http://m.daum.net"
                    }
                },
                {
                    title: "앱으로 이동",
                    link: {
                        android_execution_params: "contentId=100",
                        ios_execution_params: "contentId=100"
                    }
                }
            ]
        };
        setMessage(newMessage);
    }, []);

    useEffect(() => {
        if (DEBUG) console.log(`[Report] message`, message);
    }, [message]);


    return <>
        <div className="flex flex-col dark:bg-black h-lvh flex justify-center items-center">
            <span className="text-gray-500">Report page is under construction...</span>
            <Button onClick={onClick}>testSendKakaoMessage</Button>
        </div>
    </>
}