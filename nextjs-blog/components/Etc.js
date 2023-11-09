import { BookOpenIcon, EllipsisHorizontalCircleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function Etc(props) {
    return (
        <Link href='./post_list'>
            <form className={`flex items-center p-0.5`} onSubmit={(e) => { e.preventDefault(); }}>
                <button className='rounded-3xl inline-flex items-center justify-center text-black text-xs focus:outline-none'>
                    <BookOpenIcon strokeWidth={2} className="h-5 w-5" />
                    용어
                </button>
            </form>
        </Link>
    );
}