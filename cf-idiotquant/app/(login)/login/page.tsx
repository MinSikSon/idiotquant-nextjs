"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Button,
    Card,
    Elevation,
    H2,
    Text,
    Icon,
    Intent,
    NonIdealState,
    Spinner,
    Divider
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

import { setCloudFlareLoginStatus, selectLoginState } from "@/lib/features/login/loginSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { KakaoTotal, selectKakaoTatalState, selectKakaoTotal } from "@/lib/features/kakao/kakaoSlice";
import LoadKakaoTotal from "@/components/loadKakaoTotal";
import Image from "next/image";

const DEBUG = false;

export default function LoginPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();

    // Global States
    const loginState = useAppSelector(selectLoginState);
    const kakaoTotal: KakaoTotal = useAppSelector(selectKakaoTotal);
    const kakaoTotalState = useAppSelector(selectKakaoTatalState);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // 1. 초기 CloudFlare 로그인 상태 체크
    useEffect(() => {
        if ("init" === kakaoTotalState && "cf-need-retry" === loginState) {
            dispatch(setCloudFlareLoginStatus());
        }
    }, [loginState, kakaoTotalState, dispatch]);

    useEffect(() => {
        // 1. 카카오 데이터가 있고, 상태가 'fulfilled'일 때만 이동
        const isDataLoaded = kakaoTotal && kakaoTotal.id !== 0 && !!kakaoTotal.kakao_account?.profile?.nickname;

        if (isDataLoaded && kakaoTotalState === "fulfilled") {
            if (DEBUG) console.log(`[LoginPage] 데이터 확인 완료, 이동합니다.`);
            router.push(`${process.env.NEXT_PUBLIC_CLIENT_URL}/user`);
        }
    }, [kakaoTotal, kakaoTotalState]);

    // 카카오 로그인 실행
    const onClickLogin = () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        const redirectUrl = `${process.env.NEXT_PUBLIC_API_URL}/kakao/login`;
        const scopeParam = "&scope=friends"; // 친구 목록 권한 필요 시

        // REST_API_KEY 또는 CLIENT_ID 환경변수 확인 필요
        const clientId = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;
        const authorizeEndpoint = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUrl}${scopeParam}`;

        router.push(authorizeEndpoint);
    };

    return (
        <div className="bp5-dark min-h-screen bg-zinc-50 dark:bg-black flex flex-col justify-center items-center p-6">
            {/* 데이터 로딩 핸들러 (숨김 처리 또는 오버레이) */}
            {/* 중요: 데이터 로딩 중이거나 이미 성공했다면 로그인 버튼 대신 스피너를 보여줌 */}
            {(kakaoTotalState === "pending" || kakaoTotalState === "fulfilled") ? (
                <div className="text-center space-y-4">
                    <Spinner size={50} intent={Intent.PRIMARY} />
                    <Text className="opacity-50 font-mono animate-pulse">인증 정보를 동기화 중입니다...</Text>
                    {/* 여기서 백그라운드로 데이터를 불러오는 컴포넌트 실행 */}
                    <LoadKakaoTotal />
                </div>
            ) : (
                <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
                    {/* 상단 브랜딩 */}
                    <div className="text-center mb-10">
                        <div className="inline-flex p-4 rounded-3xl bg-blue-600 shadow-xl shadow-blue-500/20 mb-6">
                            <Icon icon={IconNames.CHART} size={40} color="white" />
                        </div>
                        <H2 className="font-black tracking-tight mb-2">IDIOT.QUANT LOGIN</H2>
                        <Text className="opacity-50 text-xs font-mono tracking-widest uppercase">
                            Secure Algorithm Investment
                        </Text>
                    </div>

                    <Card elevation={Elevation.FOUR} className="p-8 rounded-2xl dark:bg-zinc-900/80 backdrop-blur-md border-none shadow-2xl">
                        <div className="space-y-6">
                            <div className="text-center">
                                <Text className="text-lg font-semibold">서비스를 시작합니다</Text>
                                <Text className="text-xs opacity-50 mt-1">알고리즘 트레이딩을 위해 카카오 로그인이 필요합니다.</Text>
                            </div>

                            <Divider />

                            {isSubmitting ? (
                                <div className="flex flex-col items-center py-4 gap-4">
                                    <Spinner size={40} intent={Intent.PRIMARY} />
                                    <Text className="font-mono text-xs animate-pulse text-blue-500">카카오 인증 페이지로 이동 중...</Text>
                                </div>
                            ) : (
                                <Button
                                    onClick={onClickLogin}
                                    fill
                                    large
                                    className="!h-14 !rounded-xl !border-none !transition-transform active:scale-95 shadow-lg"
                                    style={{ backgroundColor: '#FEE500', color: '#191919' }}
                                >
                                    <div className="flex items-center justify-center gap-3">
                                        <Image
                                            src="/images/kakaotalk_sharing_btn_small.png"
                                            width={24}
                                            height={24}
                                            alt="kakao"
                                        />
                                        <span className="text-base font-bold">카카오로 계속하기</span>
                                    </div>
                                </Button>
                            )}

                            <div className="flex flex-col gap-2 pt-2">
                                <Text className="text-[10px] text-center opacity-40 leading-relaxed">
                                    로그인 시 서비스 이용약관 및 개인정보 처리방침에<br />동의하는 것으로 간주됩니다.
                                </Text>
                            </div>
                        </div>
                    </Card>

                    {/* 하단 푸터 정보 */}
                    {/* <div className="mt-10 flex justify-center gap-6">
                    <Button minimal small icon={IconNames.HELP} className="opacity-40">도움말</Button>
                    <Button minimal small icon={IconNames.SHIELD} className="opacity-40">보안 정책</Button>
                </div> */}
                </div>
            )}
        </div>
    );
}