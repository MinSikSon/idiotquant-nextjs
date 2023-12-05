import { CalculatorIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function Calculator(props) {
    return (
        <Link href="./calculator">
            <form className={`flex p-0.5`} onSubmit={(e) => { e.preventDefault(); }}>
                <button className='rounded-3xl inline-flex items-center justify-center text-black text-xs focus:outline-none'>
                    <CalculatorIcon strokeWidth={2} className="h-6 w-6" />
                    인플레이션<br />계산기
                </button>
            </form>
        </Link>
    );
}