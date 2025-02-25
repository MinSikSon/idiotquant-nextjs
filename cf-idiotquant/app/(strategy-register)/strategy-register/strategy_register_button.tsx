import Link from "next/link";
import RegisterTemplate from "../../../components/register_template";

export default function StrategyRegisterButton() {
    return <>
        <Link href={`/strategy-register`}>
            <RegisterTemplate
                cardBodyFix={true}
                title={<div className="font-mono">Register <span className="text-blue-500 font-bold">New</span> Investment Strategy</div>}
                subTitle={``}
                content={<span className='font-mono text-sm underline decoration-4 decoration-blue-400 hover:text-blue-500'>나만의 투자 전략을 만들어보세요 🦄</span>}
                footer={``}
            />
        </Link>
    </>
}
