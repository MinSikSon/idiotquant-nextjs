import Link from "next/link";
import Head from "next/head";
import QuantPost from "./quant";
import FamousSayingPost from "./famous_saying";
import EtcPost from "./etc";

export default function TermsPost() {
    const Title = () => {
        return (
            <Link href="/post_list">
                <div className="font-serif text-xl text-black bg-white header-contents text-center py-3">
                    글<span className='text-yellow-300'>.</span>모아 읽기
                </div>
            </Link>
        );
    };
    return (
        <div>
            <Head>
                <title>주식 용어 소개와 좋은 글 모음</title>
                <link rel="icon" href="/images/icons8-algorithm-flatart-icons-lineal-color-32.png" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
                <meta name="description" content="주식 시장에서 자주 사용되는 용어를 소개하고, 투자에 도움이 되는 좋은 글들을 모아놓은 웹 페이지입니다. 주식 시장에 대한 이해를 높이고, 투자에 필요한 정보를 제공합니다." />
            </Head>
            <Title />

            <FamousSayingPost />
            <QuantPost />
            <EtcPost />
        </div>
    )
}