"use client";

import { DesignButton } from "@/components/designButton";
import { useRouter } from "next/navigation";
import User from "./user";
import AlgorithmTradeLegacy from "@/app/(algorithm-trade-legacy)/algorithm-trade-legacy/page";
import { Button, Code, Flex, Text } from "@radix-ui/themes";

const DEBUG = false;

export default function UserPage(props: any) {

    return <>
        <div className="p-5">
            <Flex align="center" justify="center" pb="3">
                <Text size="6"><Code>사용자 정보</Code></Text>
            </Flex>
            <User />
            <AlgorithmTradeLegacy />
        </div>
    </>
}
