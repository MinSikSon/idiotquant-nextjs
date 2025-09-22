'use client'

import React, { useState } from 'react';
import { Button } from "@material-tailwind/react";
import { Input, Textarea, Card, CardHeader, CardBody, CardFooter, Typography } from "@material-tailwind/react";

interface User {
    name: string;
    email: string;
    avatarUrl?: string;
    joinedAt: string;
    bio?: string;
}

export default function User(props: any) {
    const [user, setUser] = useState<User>({
        name: props.kakaoNickName,
        email: 'iq@idiotquant.com',
        avatarUrl: 'https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcTWTMKWOI02K1eyzfFPVHno1lfEDeV4-a1ZqgZhMHWgqSDMnMgBvRclRcqQtyTJ6V82hhaCP4ZWsD4El5v8neJiS-y52uFAFlDSBR79gw',
        joinedAt: '2000-01-01',
        bio: 'Frontend engineer. Next.js + Tailwind enthusiast.',
    });

    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<User>(user);

    function getInitials(name: string) {
        const parts = name.trim().split(/\s+/);
        if (parts.length === 0) return '';
        if (parts.length === 1) return parts[0][0].toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function formatDate(dateStr: string) {
        const d = new Date(dateStr);
        return d.toLocaleDateString();
    }

    return (
        <div className="flex items-center justify-center bg-gray-50 p-6">
            <Card className="w-full max-w-2xl">
                <CardHeader floated={false} shadow={false} className="pb-0">
                    {/* <Typography variant="h4" color="blue-gray"> */}
                    {/* <Typography variant="h4" >
                        User Info
                    </Typography> */}
                </CardHeader>

                <CardBody className="flex flex-col md:flex-row gap-6">
                    <div className="flex flex-col items-center md:items-start">
                        {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} className="h-28 w-28 rounded-full object-cover" />
                        ) : (
                            <div className="h-28 w-28 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-semibold text-gray-700">
                                {getInitials(user.name)}
                            </div>
                        )}

                        {/* <Typography variant="small" color="gray" className="mt-3"> */}
                        <Typography variant="small" className="mt-3">
                            가입일: {formatDate(user.joinedAt)}
                        </Typography>
                    </div>

                    <div className="flex-1">
                        {!editing ? (
                            <div className="space-y-3">
                                {/* <Typography variant="h5" color="blue-gray">{user.name}</Typography> */}
                                <Typography variant="h5" >{user.name}</Typography>
                                {/* <Typography variant="small" color="gray">{user.email}</Typography> */}
                                <Typography variant="small">{user.email}</Typography>
                                <Typography className="mt-2">{user.bio}</Typography>
                                <div className="mt-4 flex gap-3 justify-center">
                                    {/* <Button color="blue" onClick={() => setEditing(true)}>프로필 수정</Button> */}
                                    <Button onClick={() => setEditing(true)}>프로필 수정</Button>
                                </div>
                            </div>
                        ) : (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    setUser(draft);
                                    setEditing(false);
                                }}
                                className="space-y-4"
                            >
                                {/* <Input label="이름" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /> */}
                                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                                {/* <Input label="이메일" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /> */}
                                <Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                                {/* <Input label="Avatar URL" value={draft.avatarUrl} onChange={(e) => setDraft({ ...draft, avatarUrl: e.target.value })} /> */}
                                <Input value={draft.avatarUrl} onChange={(e) => setDraft({ ...draft, avatarUrl: e.target.value })} />
                                {/* <Textarea label="한줄 소개" value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} /> */}
                                <Textarea value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} />

                                <div className="flex gap-3">
                                    {/* <Button type="submit" color="blue">저장</Button> */}
                                    <Button type="submit" >저장</Button>
                                    {/* <Button variant="outlined" color="gray" onClick={() => setEditing(false)}>취소</Button> */}
                                    <Button onClick={() => setEditing(false)}>취소</Button>
                                </div>
                            </form>
                        )}
                    </div>
                </CardBody>

                <CardFooter className="pt-0"></CardFooter>
            </Card>
        </div>
    );
}