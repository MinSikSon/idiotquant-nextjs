"use client";

import { DesignButton } from "@/components/designButton";
import { Logout } from "./logout";
import { useRouter } from "next/navigation";
import User from "./user";
import AlgorithmTradeLegacy from "@/app/(algorithm-trade-legacy)/algorithm-trade-legacy/page";
import { Code, Flex, Text } from "@radix-ui/themes";

const DEBUG = false;

export default function UserPage(props: any) {
    const router = useRouter();

    return <>
        <div className="p-5">
            <Flex align="center" justify="center">
                <Text size="6"><Code>사용자 정보</Code></Text>
            </Flex>
            <User />
            <DesignButton
                handleOnClick={() => Logout(router)}
                buttonName="logout"
                buttonBgColor="bg-[#ffea04]"
                buttonBorderColor="border-[#ebd700]"
                buttonShadowColor="#1e1e1e"
                textStyle="font-bold text-xs py-2 text-[#3c1e1e]"
                additionalTextTop={<img src="/images/kakaotalk_sharing_btn_small.png" alt="metamask" className="h-6 w-6 mx-2" />}
                // buttonStyle="mt-6"
                buttonStyle={`mt-6 flex items-center justify-center mb-2 px-1 button bg-[#ffea04] rounded-full cursor-pointer select-none
                            active:translate-y-1 active:[box-shadow:0_0px_0_0_#1e1e1e,0_0px_0_0_#1e1e1e41] active:border-b-[0px]
                            transition-all duration-150 [box-shadow:0_4px_0_0_#1e1e1e,0_8px_0_0_#1e1e1e41] border-b-[1px]
                            `}
            />
            <AlgorithmTradeLegacy />
        </div>
    </>
}
