import { EllipsisHorizontalCircleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function Etc(props) {

    if (props.openSearchResult) return <></>;

    return (
        <div className='pl-2'>
            <Link href='./post_list'>
                <EllipsisHorizontalCircleIcon strokeWidth={2} className="h-5 w-5" />
            </Link>
        </div>
    );
}