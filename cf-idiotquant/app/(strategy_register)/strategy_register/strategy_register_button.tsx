// import { Web3Card2, Web3CardPropsType } from "@/components/topCreators2";
import Link from "next/link";
import RegisterTemplate from "./register_template";

export default function StrategyRegisterButton() {
    return <>
        <Link href={`/strategy_register/0`}>
            <RegisterTemplate
                id={`-`}
                totalStepCount={1}
                title={`신규 투자 전략 등록`}
                subTitle={``}
                // content={<span className='border border-1 border-red-500 rounded p-1'>나만의 투자 전략을 만들어보세요 🦄</span>}
                content={<span className='underline decoration-4 decoration-yellow-500'>나만의 투자 전략을 만들어보세요 🦄</span>}
                footer={``}
            />
        </Link>
    </>
}
