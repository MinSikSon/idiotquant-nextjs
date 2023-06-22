import { useRouter } from "next/router";
import { useEffect } from "react"

// export async function getServerSideProps() {
//     return {
//         redirect: {
//             destination: '/',
//             permanent: false, // true로 설정하면 301 리다이렉트로 처리됩니다.
//         },
//     };
// }

export default function Login(props) {
    const router = useRouter();
    useEffect(() => {
        const _authorizeCode = new URL(window.location.href).searchParams.get('code');

        console.log(`[Login] _authorizeCode:`, _authorizeCode);

        router.push('/');
    }, []);


    return (
        <>
        </>
    )
}