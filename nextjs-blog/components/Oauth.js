import {
    ArrowRightOnRectangleIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";

export default function Oauth(props) {
    const loginStatus = (!!props.loginStatus) ? `${props.loginStatus} 🖐` : '로그인';

    const url = {
        pathname: '/login',
        query: {
            authorizeCode: props.authorizeCode,
        },
    }
    if (props.openSearchResult) return (<></>);

    return (
        <div className='text-black'>
            <form onSubmit={(e) => { e.preventDefault(); }}>
                <Link href={url} passHref as='/login'>
                    <button className='flex'>
                        <ArrowRightOnRectangleIcon strokeWidth={2} className="h-5 w-5" />
                        <div className="pt-1 text-xs">{loginStatus}</div>
                    </button>
                </Link>
            </form>
        </div>
    );
}