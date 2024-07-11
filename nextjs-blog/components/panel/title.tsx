import Link from "next/link";

export const TitlePanel = () => {
    return (
        <Link href="/">
            <div className='w-full bg-white text-md pl-2 shadow-md'>
                <div>idiot<span className='text-green-400'>.</span>quant</div>
            </div>
        </Link>
    );
}