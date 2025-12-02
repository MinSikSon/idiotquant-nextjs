"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setCloudFlareLoginStatus, selectLoginState } from "@/lib/features/login/loginSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

import { DesignButton } from "@/components/designButton";
import { KakaoTotal, selectKakaoTatalState, selectKakaoTotal } from "@/lib/features/kakao/kakaoSlice";
import LoadKakaoTotal from "@/components/loadKakaoTotal";
import { Box, Button, Code, Flex, Text } from "@radix-ui/themes";
import Image from "next/image";

const DEBUG = false;

export default function LoginPage() {
    const router = useRouter();

    const dispatch = useAppDispatch();
    const loginState = useAppSelector(selectLoginState);
    const kakaoTotal: KakaoTotal = useAppSelector(selectKakaoTotal);
    const kakaoTotalState = useAppSelector(selectKakaoTatalState);

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (DEBUG) console.log(`[LoginPage] loginState:`, loginState);
    }, []);

    useEffect(() => {
        if (DEBUG) console.log(`[LoginPage] loginState:`, loginState);
        if ("init" == kakaoTotalState && "cf-need-retry" == loginState) {
            dispatch(setCloudFlareLoginStatus());
        }
    }, [loginState]);

    useEffect(() => {
        if (DEBUG) console.log(`[LoginPage] kakaoTotal:`, kakaoTotal);
        if (undefined == kakaoTotal || kakaoTotal?.id == 0 || !!!kakaoTotal?.kakao_account?.profile?.nickname) {
            if (DEBUG) console.log(`[LoginPage] 1`);
        }
        else if ("fulfilled" != kakaoTotalState) {
            if (DEBUG) console.log(`[LoginPage] 2`);
            // waiting
        }
        else {
            if (DEBUG) console.log(`[LoginPage] 3`);
            router.push(`${process.env.NEXT_PUBLIC_CLIENT_URL}/user`); // NOTE: 로그인 성공 시 userpage 로 이동
        }
    }, [kakaoTotal]);


    useEffect(() => {
        if (DEBUG) console.log(`[LoginPage] kakaoTotalState:`, kakaoTotalState);
    }, [kakaoTotalState]);

    async function onClickLogin() {
        if (isSubmitting) return; // 중복 방지

        setIsSubmitting(true);

        const redirectUrl = `${process.env.NEXT_PUBLIC_API_URL}/kakao/login`;
        if (DEBUG) console.log(`[LoginPage] onClickLogin`, `redirectUrl:`, redirectUrl);
        const scopeParam = "&scope=friends";
        const authorizeEndpoint = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}&redirect_uri=${redirectUrl}${scopeParam}`;

        router.push(authorizeEndpoint);
    }

    if (DEBUG) console.log(`[LoginPage] kakaoTotal:`, kakaoTotal, `, undefined == kakaoTotal`, undefined == kakaoTotal);

    return (
        <Flex direction="column" align="center" justify="center" gap="6">
            {("cf-login" == loginState) && <LoadKakaoTotal />}
            <Box>
                <Text size="6"><Code>로그인</Code></Text>
                {/* <Text size="3">하려면 아래 버튼을 눌려주세요.</Text> */}
            </Box>
            {isSubmitting ? <Text size="3">처리 중...</Text> :
                <Button
                    onClick={() => onClickLogin()}
                    variant="outline"
                    radius="medium"
                    className="!px-16 !py-6 !cursor-pointer !hover:brightness-95"
                >
                    <Flex align="center" justify="center">
                        <Image src="/images/kakaotalk_sharing_btn_small.png" width="12" height="12" alt="metamask" className="h-6 w-6 mx-2" />
                        <Text size="3" weight="bold">kakao로 계속하기</Text>
                    </Flex>
                </Button>
            }
        </Flex>
    );
}