"use client";

import Link from "next/link";
import {
    Button,
    NonIdealState,
    NonIdealStateIconSize,
    Intent,
    Code,
    Text
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

// Blueprintjs CSS 가 상위 layout에 없다면 추가 (필요시)
import "@blueprintjs/core/lib/css/blueprint.css";

interface NotFoundProps {
    warnText?: string;
}

export default function NotFound({ warnText = "Oops! Not Found!" }: NotFoundProps) {
    return (
        <div className="min-h-[70vh] flex items-center justify-center p-6">
            <NonIdealState
                icon={IconNames.SEARCH_AROUND}
                iconSize={NonIdealStateIconSize.STANDARD}
                title="페이지를 찾을 수 없습니다"
                description={
                    <div className="space-y-4">
                        <Text className="text-gray-500 dark:!text-gray-400">
                            요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
                        </Text>
                        <div className="mt-2">
                            <Code className="text-lg">{warnText}</Code>
                        </div>
                    </div>
                }
                action={
                    <Link href="/" passHref>
                        <Button
                            intent={Intent.PRIMARY}
                            large
                            outlined
                            icon={IconNames.HOME}
                            text="메인 페이지로 돌아가기"
                        />
                    </Link>
                }
            />
        </div>
    );
}