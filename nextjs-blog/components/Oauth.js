import {
    ArrowRightOnRectangleIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";

export default function Oauth(props) {
    const loginStatus = (!!props.loginStatus) ? `${props.loginStatus} 🖐` : 'Login';

    const url = {
        pathname: '/login',
        query: {
            authorizeCode: props.authorizeCode,
        },
    }
    return (
        <>
            <div className={`z-20 fixed w-8 h-8 rounded-xl top-2
            ${(true === props.openSearchResult) ? `z-20` : `left-0 border-none duration-300 z-0`}
            `}>
                <form onSubmit={(e) => { e.preventDefault(); }}>
                    {props.openSearchResult ?
                        <>
                        </>
                        :
                        <Link href={url} passHref as='/login'>
                            <button className='flex items-center h-7 py-3 px-1 m-0 ml-1 mt-1'>
                                <ArrowRightOnRectangleIcon strokeWidth={2} className="h-5 w-5" />
                                <div className="pt-1">{loginStatus}</div>
                            </button>
                        </Link>
                    }
                </form>
            </div>
        </>
    );
}