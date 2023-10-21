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
            <div className={`z-20 w-fit rounded-xl right-12 md:right-32 lg:right-52 xl:right-80 2xl:right-96 border-none duration-300`}>
                <form
                    onSubmit={(e) => { e.preventDefault(); }}
                    className={`flex items-center p-0.5`}>
                    <button className='rounded-3xl inline-flex items-center justify-center text-black text-xs focus:outline-none'>
                        <CalculatorIcon />
                        인플레이션<br />계산기
                    </button>
                </form>
            </div>
        </Link>
    );
}