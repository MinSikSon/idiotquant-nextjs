import {
    ArrowRightOnRectangleIcon
} from "@heroicons/react/24/outline";

export default function Oauth(props) {
    const rest_api_key = '25079c20b5c42c7b91a72308ef5c4ad5';
    const redirect_uri = 'https://idiotquant.com/';
    const kakaoUrl = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${rest_api_key}&redirect_uri=${redirect_uri}`;

    const handleLogin = () => {
        window.location.href = kakaoUrl;
    }

    return (
        <>
            <div className={`z-20 fixed w-fit rounded-xl top-2
            ${(true === props.openSearchResult) ? `z-0` : `left-0 border-none duration-300`}
            `}>
                <form onSubmit={(e) => { e.preventDefault(); }}>
                    {props.openSearchResult ?
                        <>
                        </>
                        :
                        <button className='flex items-center h-7 py-3 px-1 m-0 ml-1 mt-1' onClick={handleLogin}>
                            <ArrowRightOnRectangleIcon strokeWidth={2} className="h-5 w-5" />
                            <div className="pt-1">kakao login</div>
                        </button>
                    }
                </form>
            </div>
        </>
    );
}