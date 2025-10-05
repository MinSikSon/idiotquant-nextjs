'use client'

import { useState, useEffect } from 'react';
import { Badge, Button } from "@material-tailwind/react";
import { Input, Textarea, Card, CardHeader, CardBody, CardFooter, Typography } from "@material-tailwind/react";
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import Link from 'next/link';
import { KakaoTotal, selectKakaoTotal } from '@/lib/features/kakao/kakaoSlice';
import { selectCloudflareUserInfo, setCloudFlareUserInfo, UserInfo } from '@/lib/features/cloudflare/cloudflareSlice';

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
                    <Typography variant="h4" >
                        User Info
                    </Typography>
                </CardHeader> */}
                <CardBody className="flex flex-col md:flex-row gap-6">
                    <div className="flex flex-col items-center space-y-1">
                        <div>
                            <Badge color="secondary">
                                <Badge.Content>
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt={user.nickname} className="h-28 w-28 rounded-full object-cover" />
                                    ) : (
                                        <div className="h-28 w-28 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-semibold text-gray-700">
                                            {getInitials(user.nickname)}
                                        </div>
                                    )}

                                </Badge.Content>
                                <Badge.Indicator>{user.point}</Badge.Indicator>
                            </Badge>
                        </div>

                        <div className="w-full flex items-center justify-center">
                            <Typography className="min-w-16 font-semibold text-xs text-right">가입일</Typography>
                            <Input readOnly className="py-1 border-none shadow-none text-black dark:text-white text-sm" value={formatDate(user.joinedAt)} />
                        </div>
                        <div className="w-full flex items-center justify-center">
                            <Typography className="min-w-16 font-semibold text-xs text-right">마지막 접속</Typography>
                            <Input readOnly className="py-1 border-none shadow-none text-black dark:text-white text-sm" value={formatDate(user.lastLoginAt)} />
                        </div>
                    </div>

                    <div className="flex-1">
                        {!editing ? (
                            <div className="space-y-1">
                                <div className="w-full flex items-center justify-center">
                                    <Typography className="min-w-16 font-semibold text-xs text-right text-blue-500">이름</Typography>
                                    <Input readOnly className="py-1 border-none shadow-none text-sm" value={user.nickname} />
                                </div>
                                <div className="w-full flex items-center justify-center">
                                    <Typography className="min-w-16 font-semibold text-xs text-right">이메일</Typography>
                                    <Input readOnly className="py-1 border-none shadow-none text-sm" value={user.email} />
                                </div>
                                <div className="w-full flex items-center justify-center">
                                    <Typography className="min-w-16 font-semibold text-xs text-right">한줄 소개</Typography>
                                    <Input readOnly className="py-1 border-none shadow-none text-sm" value={user.desc} />
                                </div>
                                <div className="mt-4 flex gap-3 justify-center">
                                    {/* <Button color="blue" onClick={() => setEditing(true)}>프로필 수정</Button> */}
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
                                    <Typography className="min-w-16 font-semibold text-xs text-right text-blue-500">이름</Typography>
                                    <Input placeholder="이름" value={draft.nickname} onChange={(e) => setDraft({ ...draft, nickname: e.target.value })} />
                                </div>
                                <div className="w-full flex items-center justify-center">
                                    <Typography className="min-w-16 font-semibold text-xs text-right">이메일</Typography>
                                    <Input placeholder="이메일" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                                </div>
                                {/* <Input label="Avatar URL" value={draft.avatarUrl} onChange={(e) => setDraft({ ...draft, avatarUrl: e.target.value })} /> */}
                                <div className="w-full flex items-center justify-center">
                                    <Typography className="min-w-16 font-semibold text-xs text-right">Avatar URL</Typography>
                                    <Input placeholder="Avatar URL" value={draft.avatarUrl} onChange={(e) => setDraft({ ...draft, avatarUrl: e.target.value })} />
                                </div>
                                <div className="w-full flex items-center justify-center">
                                    <Typography className="min-w-16 font-semibold text-xs text-right">한줄 소개</Typography>
                                    <Textarea placeholder="한줄 소개" value={draft.desc} onChange={(e) => setDraft({ ...draft, desc: e.target.value })} />
                                </div>

                                <div className="flex gap-3">
                                    <Button type="submit" color="info">저장</Button>
                                    <Button variant="outline" color="primary" onClick={() => setEditing(false)}>취소</Button>
                                </div>
                            </form>
                        )}
                    </div>
                </CardBody>

                <CardFooter className="w-full pt-0 flex items-center justify-center">
                    {(kakaoTotal?.kakao_account?.profile?.nickname === process.env.NEXT_PUBLIC_MASTER) && <Link href="/report" ><Button>ReportPage</Button></Link>}
                </CardFooter>
            </Card>
        </div>
    );
}