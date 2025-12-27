"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    H3,
    Divider,
    Spinner,
    NonIdealState,
    Intent,
    Button
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

import User from "./user";
import AlgorithmTradeLegacy from "@/app/(algorithm-trade-legacy)/algorithm-trade-legacy/page";
import { useAppSelector } from "@/lib/hooks";
import { selectKakaoTatalState, selectKakaoTotal } from "@/lib/features/kakao/kakaoSlice";
import LoadKakaoTotal from "@/components/loadKakaoTotal";

export default function UserPage() {
    const router = useRouter();
    const kakaoTotal = useAppSelector(selectKakaoTotal);
    const kakaoTotalState = useAppSelector(selectKakaoTatalState);
    const [mount, setMount] = useState(false);

    useEffect(() => {
        setMount(true);
    }, []);

    // 로딩 중이거나 초기 상태일 때 보여줄 화면
    if (!mount || kakaoTotalState === "init" || kakaoTotalState === "pending") {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black">
                {/* 핵심: 여기서 LoadKakaoTotal를 렌더링해야 
                  쿠키를 읽어서 Redux 상태를 'fulfilled'로 바꿔줍니다.
                */}
                <LoadKakaoTotal />

                <NonIdealState
                    icon={<Spinner intent={Intent.PRIMARY} size={50} />}
                    title="인증 정보를 확인하고 있습니다"
                    description="잠시만 기다려 주시면 보안 세션을 연결합니다."
                />
            </div>
        );
    }

    // 데이터 로드 완료 후 사용자가 없는 경우 (로그인 안 됨)
    if (kakaoTotalState === "fulfilled" && (!kakaoTotal || !kakaoTotal.id)) {
        return (
            <div className="h-screen flex items-center justify-center">
                <NonIdealState
                    icon={IconNames.LOCK}
                    title="로그인이 필요한 서비스입니다"
                    description="정보를 불러올 수 없습니다. 다시 로그인해 주세요."
                    action={
                        <Button
                            intent={Intent.PRIMARY}
                            large
                            onClick={() => router.push("/login")}
                        >
                            로그인 페이지로 이동
                        </Button>
                    }
                />
            </div>
        );
    }

    // 데이터 로드 완료된 정상 화면
    return (
        <div className="p-4 md:p-10 max-w-6xl mx-auto animate-in fade-in duration-700">
            {/* 데이터 업데이트를 지속적으로 감시하기 위해 컨텐츠 페이지에도 포함 가능 */}
            <LoadKakaoTotal />

            <div className="text-center mb-10">
                <H3 className="font-black tracking-widest uppercase opacity-40">User Dashboard</H3>
            </div>

            <Divider className="mb-10" />

            <div className="space-y-16">
                <section>
                    <User />
                </section>

                <Divider />

                <section>
                    <AlgorithmTradeLegacy />
                </section>
            </div>
        </div>
    );
}