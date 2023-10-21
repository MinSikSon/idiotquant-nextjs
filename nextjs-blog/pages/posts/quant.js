import Link from "next/link";
import Head from "next/head";
import ArticleTemplate from "./template";

const Quant = () => {
    return (
        <div>
            <ul className='list-disc list-outside pb-4'>
                <li>계량투자 (퀀트투자): 수치만 보고 투자하는 방식</li>
                <li>투자스타일</li>
                <ul className='list-disc list-inside'>
                    <li>밸류 전략: 가치투자</li>
                    <li>퀄리티 전략: 우량주투자</li>
                    <li>모멘텀 전략: 추세투자</li>
                    <li>자산배분 전략: 주식, 채권, 현금 등에 자산을 배분</li>
                    <li>콤보 전략: 위 4개 전략 조합</li>
                </ul>
            </ul >
            <ul className='list-disc list-outside bg-gray-200 pb-4'>
                <li>매출 총액 - 매출 원가 = 매출 이익</li>
                <li>매출 이익 - 판매 관리비 = 영업 이익</li>
            </ul>

        </div>
    );
}


export default function TermsPost() {
    const Title = () => {
        return (
            <Link href="/post_list">
                <div className="font-serif text-xl text-black bg-white header-contents text-center py-3">
                    퀀트<span className='text-yellow-300'>.</span>용어
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
            <ArticleTemplate title={`퀀트 용어`} subTitle={`🌵`} detail={<Quant />} img1={`https://www.syesd.co.kr/homepage/syStoryImageFolder/1614817264026_fb8ff05cd5914f31981ff8aab95f8219_01.png`} img2={`https://i.ytimg.com/vi/7S5ZdmnXQyU/maxresdefault.jpg`} img3={"https://i.pinimg.com/736x/19/1a/ba/191aba7a077145d3a3bb6c5455c914af.jpg"} />

            {/* https://namu.wiki/w/벤저민%20그레이엄 */}
        </div>
    )
}