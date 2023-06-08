import {
    ArrowRightOnRectangleIcon
} from "@heroicons/react/24/outline";

export default function Oauth(props) {
    const loginStatus = (!!props.authorizeCode) ? 'kakao logout' : 'kakao login';

    const handleLogin = () => {
        console.log('handleLogin');

        const rest_api_key = '25079c20b5c42c7b91a72308ef5c4ad5';
        const redirect_uri = 'https://idiotquant.com/';
        const kakaoUrl = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${rest_api_key}&redirect_uri=${redirect_uri}`;

        window.location.href = kakaoUrl;
    }

    const handleLogout = () => {
        console.log('handleLogout');

        const redirect_uri = 'https://idiotquant.com/';

        const url = 'https://kapi.kakao.com/v1/user/logout';
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${props.accessToken}`,
            },
        };

        fetch(url, requestOptions)
            .then(response => {
                // POST 요청이 성공한 경우에 대한 처리
                if (response.ok) {
                    console.log('Logout successful');
                    window.location.href = redirect_uri;
                } else {
                    throw new Error('Logout failed');
                }
            })
            .catch(error => {
                // POST 요청이 실패한 경우에 대한 처리
                console.error(error);
            });
    }

    const handleClick = () => {
        if (!!props.authorizeCode) {
            handleLogout();
        }
        else {
            handleLogin();
        }
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
                        <button className='flex items-center h-7 py-3 px-1 m-0 ml-1 mt-1' onClick={handleClick}>
                            <ArrowRightOnRectangleIcon strokeWidth={2} className="h-5 w-5" />
                            <div className="pt-1">{loginStatus}</div>
                        </button>
                    }
                </form>
            </div>
        </>
    );
}