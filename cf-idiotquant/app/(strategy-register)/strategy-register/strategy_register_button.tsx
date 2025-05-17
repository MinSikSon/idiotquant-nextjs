import Link from "next/link";
import RegisterTemplate from "../../../components/register_template";
import { DesignButton } from "@/components/DesignButton";

export default function StrategyRegisterButton() {
    return <>
        <div className="flex p-1 m-1 w-fit">
            <Link href={`/strategy-register`}>
                <DesignButton
                    handleOnClick={() => { }}
                    buttonName={<div className="">
                        <div className="font-mono pb-1">Register <span className="text-blue-500 font-bold">New</span> Investment Strategy</div>
                        <span className='font-mono text-xs underline decoration-4 decoration-blue-400 hover:text-blue-500'>나만의 투자 전략을 만들어보세요 🦄</span>
                    </div>}
                    buttonBgColor="bg-white"
                    buttonBorderColor="border-gray-300"
                    buttonShadowColor="#D5D5D5"
                    textStyle="text-xs"
                    buttonStyle={`rounded-lg p-2 mb-2 button bg-white cursor-pointer select-none
                                               active:translate-y-1 active:[box-shadow:0_0px_0_0_#D5D5D5,0_0px_0_0_#D5D5D541] active:border-[0px]
                                               transition-all duration-150 [box-shadow:0_4px_0_0_#D5D5D5,0_8px_0_0_#D5D5D541] border-[1px]
                                               `}
                />
            </Link>
        </div>
    </>
}
