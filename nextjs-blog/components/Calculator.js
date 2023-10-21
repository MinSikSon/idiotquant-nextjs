import Link from "next/link";

export default function Calculator(props) {
    const CalculatorIcon = (props) => {
        return (
            <img className='h-7' src='/images/icons8-calculator-48.png'></img>
        );
    }

    // console.log(`props.openSearchResult`, props.openSearchResult);
    if (props.openSearchResult) return <></>;
    return (
        <Link href="./calculator">
            <form className={`flex items-center p-0.5`} onSubmit={(e) => { e.preventDefault(); }}>
                <button className='rounded-3xl inline-flex items-center justify-center text-black text-xs focus:outline-none'>
                    <CalculatorIcon />
                    인플레이션<br />계산기
                </button>
            </form>
        </Link>
    );
}