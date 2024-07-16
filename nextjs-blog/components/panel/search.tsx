import { MagnifyingGlassIcon } from "@heroicons/react/24/outline"
import Link from "next/link"

export const SearchPanel = (props) => {
    return <>
        <Link href="/search">
            <MagnifyingGlassIcon className="h-6 w-6" />
        </Link>
    </>
}