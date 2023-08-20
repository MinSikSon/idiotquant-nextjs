import Link from "next/link";

export default function Title() {
    return (
        <Link href="./posts/terms">
            <div
                className='font-serif 
                text-xl sm:text-xl md:text-2xl lg:text-3xl
                text-black header-contents text-center py-3
                sm:underline sm:decoration-2 md:decoration-4 sm:decoration-green-400'
            >
                IDIOT<span className='text-green-400'>.</span>QUANT
            </div>
        </Link>
    );
};