"use client";

import { KakaoMessage, setKakaoMessage } from "@/lib/features/login/loginSlice";
import { useAppDispatch } from "@/lib/hooks";
import { Button, Card, CardBody, CardFooter, CardHeader } from "@material-tailwind/react";

import Image from "next/image";
import Link from "next/link";

const DEBUG = false;

interface DefaultProps {
    message: KakaoMessage;
}

export function SendKakaoMessage(props: DefaultProps) {
    const dispatch = useAppDispatch();

    function onClick() {
        if (DEBUG) console.log(`[Report] setKakaoMessage`);
        if (DEBUG) console.log(`[Report] message:`, props.message);

        dispatch(setKakaoMessage(props.message));
    }

    return <>
        <div className="flex flex-col dark:bg-black h-fit justify-center items-center">
            <span className="text-gray-500">Report page is under construction...</span>
            <Button onClick={onClick}>testSendKakaoMessage</Button>
        </div>
    </>
}


interface KakaoFeedProps {
    template: any; // 실제로는 타입을 더 구체적으로 정의해도 좋음
}

export function KakaoFeed(props: DefaultProps) {
    const content = props.message.content;
    const itemContent = props.message.item_content;
    const social = props.message.social;

    return (
        <Card className="w-full max-w-lg mx-auto shadow-xl rounded-2xl">
            {/* 이미지 */}
            <CardHeader className="p-0">
                <Image
                    src={content.image_url}
                    alt={content.title}
                    width={content.image_width}
                    height={content.image_height}
                    className="rounded-t-2xl object-cover w-full"
                />
            </CardHeader>

            {/* 텍스트 내용 */}
            <CardBody className="space-y-1">
                {/* 아이템 리스트 */}
                {itemContent && (
                    <div className="space-y-1">
                        <div className="pt-1 pb-2 flex items-center gap-2 border-b">
                            <Image
                                src={itemContent.profile_image_url}
                                alt="profile"
                                width={32}
                                height={32}
                                className="rounded-full"
                            />
                            <span className="text-sm font-semibold">{itemContent.profile_text}</span>
                        </div>
                        <div className="py-2 flex justify-between border-b">
                            <div className="flex flex-col">
                                <h2 className="font-bold text-lg">{itemContent.title_image_text}</h2>
                                <p className="text-sm text-gray-500">{itemContent.title_image_category}</p>
                            </div>
                            <div className="w-16 h-16 relative overflow-hidden rounded">
                                <Image
                                    src={itemContent.title_image_url}
                                    alt="profile"
                                    fill
                                    style={{ objectFit: "cover", objectPosition: "center" }}
                                />
                            </div>
                        </div>
                        <div className="space-y-1 text-sm">
                            {itemContent.items.map((it: any, idx: number) => (
                                <div key={idx} className="flex justify-between">
                                    <span>{it.item}</span>
                                    <span className="text-gray-500">{it.item_op}</span>
                                </div>
                            ))}
                            <div className="flex justify-between font-bold border-b py-2">
                                <span>{itemContent.sum}</span>
                                <span>{itemContent.sum_op}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="py-1 border-b">
                    <h2 className="text-lg">{content.title}</h2>
                    <p className="text-gray-700">{content.description}</p>
                </div>
                {/* 소셜 정보 */}
                {social && (
                    <div className="py-1 flex gap-4 text-sm text-gray-600">
                        <span>👍 {social.like_count}</span>
                        <span>💬 {social.comment_count}</span>
                        <span>🔄 {social.shared_count}</span>
                        <span>👀 {social.view_count}</span>
                    </div>
                )}
            </CardBody>

            {/* 버튼 */}
            {props.message.buttons?.length > 0 && (
                <CardFooter className="flex gap-3 justify-center">
                    {props.message.buttons.map((btn: any, idx: number) => (
                        <Link
                            key={idx}
                            href={btn.link.web_url || "#"}
                            target="_blank"
                            className="w-full"
                        >
                            <Button variant="outline" className="w-full">
                                {btn.title}
                            </Button>
                        </Link>
                    ))}
                </CardFooter>
            )}
        </Card>
    );
}
