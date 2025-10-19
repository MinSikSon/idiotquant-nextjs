'use client'

import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import Link from 'next/link';
import { KakaoTotal, selectKakaoTotal } from '@/lib/features/kakao/kakaoSlice';
import { selectCloudflareUserInfo, setCloudFlareUserInfo, UserInfo } from '@/lib/features/cloudflare/cloudflareSlice';
import { getBadgeColor, getLevel, getProgress } from './level';
import { Button, Card, Box, Text, TextField, TextArea, Progress, Avatar } from '@radix-ui/themes';

const DEBUG = false;

export default function User() {
    const dispatch = useAppDispatch();
    const cfUserInfo: UserInfo = useAppSelector(selectCloudflareUserInfo);
    const kakaoTotal: KakaoTotal = useAppSelector(selectKakaoTotal);

    const [user, setUser] = useState<UserInfo>({
        state: "init",
        nickname: "",
        email: 'iq@idiotquant.com',
        avatarUrl: 'https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcTWTMKWOI02K1eyzfFPVHno1lfEDeV4-a1ZqgZhMHWgqSDMnMgBvRclRcqQtyTJ6V82hhaCP4ZWsD4El5v8neJiS-y52uFAFlDSBR79gw',
        joinedAt: 0,
        lastLoginAt: 0,
        desc: "",
        point: 0,
        // desc: 'Frontend engineer. Next.js + Tailwind enthusiast.',
        // bio: cfUserInfo.desc ?? "Frontend engineer. Next.js + Tailwind enthusiast.",
    });

    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<UserInfo>(user);

    useEffect(() => {
        if (DEBUG) console.log(`[User] cfUserInfo:`, cfUserInfo);
        if (cfUserInfo?.state === "fulfilled") {
            setUser({ ...user, ...cfUserInfo });
            setDraft({ ...draft, ...cfUserInfo });
        }
    }, [cfUserInfo]);

    useEffect(() => {
        if (DEBUG) console.log(`[User] kakaoTotal:`, kakaoTotal);
        // TODO: kakaoTotal에 있는 정보 활용해도 좋을 듯 함.
    }, [kakaoTotal]);

    function getInitials(name: string) {
        console.log('name', name, !!name);
        if (!name)
            return <Box width="24px" height="24px">
                <svg viewBox="0 0 64 64" fill="currentColor">
                    <path d="M41.5 14c4.687 0 8.5 4.038 8.5 9s-3.813 9-8.5 9S33 27.962 33 23 36.813 14 41.5 14zM56.289 43.609C57.254 46.21 55.3 49 52.506 49c-2.759 0-11.035 0-11.035 0 .689-5.371-4.525-10.747-8.541-13.03 2.388-1.171 5.149-1.834 8.07-1.834C48.044 34.136 54.187 37.944 56.289 43.609zM37.289 46.609C38.254 49.21 36.3 52 33.506 52c-5.753 0-17.259 0-23.012 0-2.782 0-4.753-2.779-3.783-5.392 2.102-5.665 8.245-9.472 15.289-9.472S35.187 40.944 37.289 46.609zM21.5 17c4.687 0 8.5 4.038 8.5 9s-3.813 9-8.5 9S13 30.962 13 26 16.813 17 21.5 17z" />
                </svg>
            </Box>

        const parts = name.trim().split(/\s+/);
        if (parts.length === 0) return '';
        if (parts.length === 1) return parts[0][0].toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function formatDate(dateStr: number) {
        const d = new Date(dateStr);
        // const formatted = d.toLocaleDateString();
        const formatted = d.toLocaleString("ko-KR", {
            timeZone: "Asia/Seoul",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
        // const formatted = d.toString();

        return formatted;
    }

    return (
        <div className="flex flex-col items-center justify-center bg-gray-50 dark:bg-black dark:text-white px-6 py-0">
            <div className="w-full font-mono text-xl mb-2 text-left">
                {user.nickname}님 반갑습니다.
            </div>
            <Card className="w-full max-w-2xl">
                {/* <CardHeader floated={false} shadow={false} className="pb-0">
                    <Text variant="h4" >
                        User Info
                    </Text>
                </CardHeader> */}
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex flex-col items-center space-y-1">
                        <div>
                            <div className="w-full flex flex-col items-center justify-center pb-1">
                                <div>
                                    {getLevel(Number(user.point))}
                                </div>
                                <div className="w-full">
                                    <Progress
                                        value={getProgress(Number(user.point))}
                                        // color="crimson"
                                        className="border border-gray-900/10 bg-gray-900/5 p-0 h-1 dark:border-gray-800 dark:bg-gray-900"
                                        size="3"
                                    />
                                </div>
                            </div>
                            <Avatar
                                size="9"
                                src={user.avatarUrl}
                                fallback={getInitials(user.nickname)}
                            />
                        </div>
                        <div className="w-full flex items-center justify-center">
                            <Text className="min-w-16 font-semibold text-xs text-right">가입일</Text>
                            <div className="pl-1 w-60">
                                <TextField.Root readOnly className="border-none shadow-none text-black dark:text-white text-sm" value={formatDate(user.joinedAt)} />
                            </div>
                        </div>
                        <div className="w-full flex items-center justify-center">
                            <Text className="min-w-16 font-semibold text-xs text-right">마지막 접속</Text>
                            <div className="pl-1 w-60">
                                <TextField.Root readOnly className="border-none shadow-none text-black dark:text-white text-sm" value={formatDate(user.lastLoginAt)} />
                            </div>
                        </div>
                    </div>

                    <div className="flex-1">
                        {!editing ? (
                            <div className="space-y-1">
                                <div className="w-full flex items-center justify-center">
                                    <Text className="min-w-16 font-semibold text-xs text-right text-blue-500">이름</Text>
                                    <div className="pl-1 w-60">
                                        <TextField.Root readOnly className="border-none shadow-none text-sm" value={user.nickname} />
                                    </div>
                                </div>
                                <div className="w-full flex items-center justify-center">
                                    <Text className="min-w-16 font-semibold text-xs text-right">이메일</Text>
                                    <div className="pl-1 w-60">
                                        <TextField.Root readOnly className="border-none shadow-none text-sm" value={user.email} />
                                    </div>
                                </div>
                                <div className="w-full flex items-center justify-center">
                                    <Text className="min-w-16 font-semibold text-xs text-right">한줄 소개</Text>
                                    <div className="pl-1 w-60">
                                        <TextField.Root readOnly className="border-none shadow-none text-sm" value={user.desc} />
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-3 justify-center">
                                    <Button onClick={() => setEditing(true)}>프로필 수정</Button>
                                </div>
                            </div>
                        ) : (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (DEBUG) console.log(`[User] handleSave draft:`, draft);
                                    setUser(draft);
                                    dispatch(setCloudFlareUserInfo(draft));
                                    setEditing(false);
                                }}
                                className="space-y-1"
                            >
                                <div className="w-full flex items-center justify-center">
                                    <Text className="min-w-16 font-semibold text-xs text-right text-blue-500">이름</Text>
                                    <TextField.Root placeholder="이름" value={draft.nickname} onChange={(e) => setDraft({ ...draft, nickname: e.target.value })} />
                                </div>
                                <div className="w-full flex items-center justify-center">
                                    <Text className="min-w-16 font-semibold text-xs text-right">이메일</Text>
                                    <TextField.Root placeholder="이메일" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                                </div>
                                {/* <TextField.Root label="Avatar URL" value={draft.avatarUrl} onChange={(e) => setDraft({ ...draft, avatarUrl: e.target.value })} /> */}
                                <div className="w-full flex items-center justify-center">
                                    <Text className="min-w-16 font-semibold text-xs text-right">Avatar URL</Text>
                                    <TextField.Root placeholder="Avatar URL" value={draft.avatarUrl} onChange={(e) => setDraft({ ...draft, avatarUrl: e.target.value })} />
                                </div>
                                <div className="w-full flex items-center justify-center">
                                    <Text className="min-w-16 font-semibold text-xs text-right">한줄 소개</Text>
                                    <TextArea placeholder="한줄 소개" value={draft.desc} onChange={(e) => setDraft({ ...draft, desc: e.target.value })} />
                                </div>

                                <div className="flex gap-3">
                                    <Button type="submit" >저장</Button>
                                    <Button variant="outline" onClick={() => setEditing(false)}>취소</Button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                <div className="w-full pt-1 flex items-center justify-center">
                    {(kakaoTotal?.kakao_account?.profile?.nickname === process.env.NEXT_PUBLIC_MASTER) && <Link href="/report" ><Button>ReportPage</Button></Link>}
                </div>
            </Card>
        </div>
    );
}