"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from "next/navigation";

// Blueprintjs Components
import {
    Card,
    Button,
    ProgressBar,
    Divider,
    Tag,
    InputGroup,
    TextArea,
    H3,
    H6,
    Elevation,
    Icon,
    Intent,
    Callout,
    Section,
    SectionCard
} from "@blueprintjs/core";

// CSS Imports
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";

// Project Redux/Utils
import { KakaoTotal, selectKakaoTatalState, selectKakaoTotal } from '@/lib/features/kakao/kakaoSlice';
import { selectCloudflareUserInfo, setCloudFlareUserInfo, UserInfo } from '@/lib/features/cloudflare/cloudflareSlice';
import { selectLoginState, setCloudFlareLoginStatus } from '@/lib/features/login/loginSlice';
import { getLevel, xpBucket } from './level';
import { Logout } from "./logout";
import { IconNames } from '@blueprintjs/icons';

const DEBUG = false;

export default function UserPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();

    // Redux Selectors
    const cfUserInfo: UserInfo = useAppSelector(selectCloudflareUserInfo);
    const kakaoTotal: KakaoTotal = useAppSelector(selectKakaoTotal);
    const loginState = useAppSelector(selectLoginState);
    const kakaoTotalState = useAppSelector(selectKakaoTatalState);

    // Local States
    const [user, setUser] = useState<UserInfo>({
        state: "init",
        nickname: "",
        email: 'iq@idiotquant.com',
        avatarUrl: '',
        joinedAt: 0,
        lastLoginAt: 0,
        desc: "",
        point: 0,
    });

    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<UserInfo>(user);
    const [isLoaded, setIsLoaded] = useState(false);
    const [xpInfo, setXpInfo] = useState({ xp: 0, denom: 100, num: 0, progressRatio: 0 });

    // Initial Login Check
    useEffect(() => {
        if ("init" === loginState) {
            dispatch(setCloudFlareLoginStatus());
        }
    }, [loginState, dispatch]);

    // Data Sync: Redux to Local State
    useEffect(() => {
        if (cfUserInfo?.state === "fulfilled" && !isLoaded) {
            const newUser = { ...user, ...cfUserInfo };
            setUser(newUser);
            setDraft(newUser);
            setIsLoaded(true);
            setXpInfo(xpBucket(Number(cfUserInfo.point)));
        }
    }, [cfUserInfo, isLoaded, user]);

    // Auth Redirect
    useEffect(() => {
        if (kakaoTotalState === "fulfilled" && (!kakaoTotal || kakaoTotal.id === 0)) {
            router.push(`${process.env.NEXT_PUBLIC_CLIENT_URL}/login/`);
        }
    }, [kakaoTotal, kakaoTotalState, router]);

    const handleSave = (e: FormEvent) => {
        e.preventDefault();
        setUser(draft);
        dispatch(setCloudFlareUserInfo(draft));
        setEditing(false);
    };

    const formatDate = (dateNum: number) => {
        if (!dateNum || dateNum === 0) return "정보 없음";
        return new Date(dateNum).toLocaleString("ko-KR", {
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit"
        });
    };

    // --- SKELETON RENDER ---
    if (kakaoTotalState === "pending" || !isLoaded) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-6 md:p-12">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header Card Skeleton */}
                    <Card elevation={Elevation.ONE} className="!p-0 overflow-hidden border-none shadow-md bg-white dark:bg-zinc-900">
                        <div className="h-32 bg-gray-200 dark:bg-zinc-800 bp5-skeleton" />
                        <div className="px-8 pb-8">
                            <div className="relative flex flex-col md:flex-row items-end -mt-12 gap-6">
                                <div className="w-32 h-32 rounded-2xl border-4 border-white dark:border-zinc-900 bg-gray-300 dark:bg-zinc-700 bp5-skeleton shadow-xl" />
                                <div className="flex-1 pb-2 space-y-3">
                                    <div className="h-8 w-48 bp5-skeleton" />
                                    <div className="h-4 w-32 bp5-skeleton" />
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Left Column Skeleton */}
                        <div className="md:col-span-1 space-y-6">
                            <SectionCard className="space-y-6">
                                <div className="flex justify-between h-5 bp5-skeleton w-24" />
                                <div className="space-y-4">
                                    <div className="flex justify-between h-6 bp5-skeleton" />
                                    <Divider />
                                    <div className="space-y-3">
                                        <div className="h-4 w-full bp5-skeleton" />
                                        <div className="h-2 w-full bp5-skeleton" />
                                    </div>
                                </div>
                            </SectionCard>
                        </div>

                        {/* Right Column Skeleton */}
                        <div className="md:col-span-2">
                            <Card className="h-full bg-white dark:bg-zinc-900 shadow-sm min-h-[400px]">
                                <div className="space-y-8">
                                    <div className="h-5 w-32 bp5-skeleton" />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div key={i} className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bp5-skeleton" />
                                                <div className="space-y-2 flex-1">
                                                    <div className="h-3 w-12 bp5-skeleton" />
                                                    <div className="h-4 w-24 bp5-skeleton" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <Divider />
                                    <div className="space-y-3">
                                        <div className="h-5 w-24 bp5-skeleton" />
                                        <div className="h-20 w-full bp5-skeleton rounded-lg" />
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const isMaster = kakaoTotal?.kakao_account?.profile?.nickname === process.env.NEXT_PUBLIC_MASTER;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-6 md:p-12">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* 1. Profile Header Card */}
                <Card elevation={Elevation.ONE} className="!p-0 overflow-hidden border-none shadow-md bg-white dark:bg-zinc-900">
                    <div className="h-32 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700" />
                    <div className="px-8 pb-8">
                        <div className="relative flex flex-col md:flex-row items-end -mt-12 gap-6">
                            <div className="relative">
                                <img
                                    src={user.avatarUrl || 'https://via.placeholder.com/150'}
                                    alt="Profile Avatar"
                                    className="w-32 h-32 rounded-2xl border-4 border-white dark:border-zinc-900 shadow-xl object-cover bg-white"
                                />
                                <div className="absolute -bottom-2 -right-2">
                                    <Tag round large intent={Intent.PRIMARY}>
                                        {`LEVEL ${getLevel(Number(user.point))}`}
                                    </Tag>
                                </div>
                            </div>

                            <div className="flex-1 pb-2">
                                <div className="flex justify-between items-center flex-wrap gap-4">
                                    <div>
                                        <H3 className="!m-0 dark:text-white font-bold">{user.nickname || "사용자"}</H3>
                                        <p className="text-gray-500 font-medium">{user.email}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            icon="edit"
                                            text="프로필 편집"
                                            onClick={() => setEditing(true)}
                                            outlined
                                        />
                                        <Button
                                            icon="log-out"
                                            intent={Intent.DANGER}
                                            minimal
                                            onClick={() => Logout(router)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* 2. Left Column: Stats & Security */}
                    <div className="md:col-span-1 space-y-6">
                        <Section title="성장 리포트" icon={IconNames.TIMELINE_EVENTS}>
                            <SectionCard>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-bold text-gray-400 uppercase">Total XP</span>
                                        <span className="text-xl font-mono font-bold text-blue-600">{user.point.toLocaleString()}</span>
                                    </div>
                                    <Divider />
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span>다음 레벨까지</span>
                                            <span>{Math.round(xpInfo.progressRatio * 100)}%</span>
                                        </div>
                                        <ProgressBar
                                            intent={Intent.PRIMARY}
                                            value={xpInfo.progressRatio}
                                            animate={false}
                                            stripes={false}
                                        />
                                        <p className="text-[11px] text-gray-500 text-center">
                                            {xpInfo.num} / {xpInfo.denom} XP
                                        </p>
                                    </div>
                                </div>
                            </SectionCard>
                        </Section>

                        <Callout intent={Intent.SUCCESS} icon="shield" title="계정 보호 중" className="text-xs">
                            본 계정은 카카오 소셜 인증으로 안전하게 보호되고 있습니다.
                        </Callout>
                    </div>

                    {/* 3. Right Column: Detailed Info / Edit Form */}
                    <div className="md:col-span-2">
                        <Card className="h-full bg-white dark:bg-zinc-900 shadow-sm" elevation={Elevation.ZERO}>
                            {editing ? (
                                <form className="space-y-5" onSubmit={handleSave}>
                                    <H6 className="uppercase text-gray-400 tracking-widest border-b pb-2">Profile Settings</H6>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold mb-1.5 block text-gray-600 dark:text-gray-400">닉네임</label>
                                            <InputGroup
                                                large
                                                leftIcon="user"
                                                value={draft.nickname}
                                                onChange={(e) => setDraft({ ...draft, nickname: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold mb-1.5 block text-gray-600 dark:text-gray-400">아바타 URL</label>
                                            <InputGroup
                                                leftIcon="media"
                                                value={draft.avatarUrl}
                                                onChange={(e) => setDraft({ ...draft, avatarUrl: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold mb-1.5 block text-gray-600 dark:text-gray-400">한줄 소개</label>
                                            <TextArea
                                                fill
                                                rows={4}
                                                value={draft.desc}
                                                onChange={(e) => setDraft({ ...draft, desc: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <Button intent={Intent.PRIMARY} type="submit" text="변경사항 저장" large className="px-8" />
                                        <Button onClick={() => setEditing(false)} text="취소" large minimal />
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-8">
                                    <div>
                                        <H6 className="uppercase text-gray-400 tracking-widest mb-4">Account Details</H6>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6">
                                            <InfoField icon="envelope" label="이메일 주소" value={user.email ?? "이메일 정보 없음"} />
                                            <InfoField icon="id-number" label="닉네임" value={user.nickname} />
                                            <InfoField icon="calendar" label="최초 가입일" value={formatDate(user.joinedAt)} />
                                            <InfoField icon="history" label="최근 로그인" value={formatDate(user.lastLoginAt)} />
                                        </div>
                                    </div>

                                    <Divider />

                                    <div>
                                        <H6 className="uppercase text-gray-400 tracking-widest mb-3">About Me</H6>
                                        <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg min-h-[80px]">
                                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed italic text-sm">
                                                {user.desc || "등록된 소개글이 없습니다. 프로필 수정을 통해 자신을 소개해 보세요."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Admin Dashboard Entry */}
                                    {isMaster && (
                                        <Link href="/report" className="no-underline block">
                                            <Callout intent={Intent.WARNING} icon="shield" title="관리자 권한 확인됨" className="hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors cursor-pointer">
                                                <p className="text-xs mb-2">마스터 대시보드에서 시스템 리포트를 확인할 수 있습니다.</p>
                                                <Button text="대시보드 바로가기" rightIcon="chevron-right" small minimal />
                                            </Callout>
                                        </Link>
                                    )}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>

                {/* Logout Action Area */}
                <div className="flex flex-col items-center pt-10 gap-4">
                    <Button
                        large
                        outlined
                        onClick={() => Logout(router)}
                        className="!px-12 !py-6 group"
                    >
                        <div className="flex items-center gap-3">
                            <Image src="/images/kakaotalk_sharing_btn_small.png" width="20" height="20" alt="kakao" />
                            <span className="font-bold text-gray-700 dark:text-gray-300 group-hover:text-black">kakao 로그아웃</span>
                        </div>
                    </Button>
                    <p className="text-[10px] text-gray-400">ID: {kakaoTotal?.id} | Device: Web Browser</p>
                </div>
            </div>
        </div>
    );
}

// Reusable Info Field Component
function InfoField({ icon, label, value }: { icon: any, label: string, value: string }) {
    return (
        <div className="flex items-center group">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mr-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-all">
                <Icon icon={icon} size={16} className="text-gray-500 dark:text-gray-400 group-hover:text-blue-600" />
            </div>
            <div className="overflow-hidden">
                <p className="text-[10px] uppercase font-black text-gray-400 mb-0.5 tracking-tighter">{label}</p>
                <p className="text-sm font-semibold dark:text-zinc-200 truncate">{value}</p>
            </div>
        </div>
    );
}