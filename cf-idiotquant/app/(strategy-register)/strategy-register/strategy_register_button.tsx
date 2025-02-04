import Link from "next/link";
import RegisterTemplate from "./register_template";

export default function StrategyRegisterButton() {
    return <>
        <Link href={`/strategy-register`}>
            <RegisterTemplate
                cardBodyFix={true}
                title={`신규 투자 전략 등록`}
                subTitle={``}
                content={<span className='underline decoration-4 decoration-blue-400 hover:text-blue-500'>나만의 투자 전략을 만들어보세요 🦄</span>}
                footer={``}
            />
        </Link>
    </>
}
