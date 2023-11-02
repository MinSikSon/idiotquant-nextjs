import Link from "next/link";
import Head from "next/head";
import ArticleTemplate from "./template";

const RayDalio = () => {
    return (
        <ul className='list-disc list-inside'>
            <li>역사는 반복된다</li>
            <li>1980년 3월, 은 가격 폭락. 시기가 중요하다.</li>
            <li>브리지워터</li>
        </ul>
    );
}

const Graham = (props) => {
    return (
        <ul className='list-disc list-inside'>
            <li>청산가치가 시가총액보다 크면서 흑자인 기업에 투자하는 전략</li>
            <li>조건에 부합하는 종목 20~30 개 정도를 매수 하는 전략</li>
            <li>그러나 종목이 몇 개 없다면, 1개 기업에 내 자산의 최대 10% 만 투자하도록</li>
        </ul>
    );
}

const Warren = (props) => {
    return (
        <ul className='list-disc list-inside'>
            <li>좋은 기업을 좋은 가격에 사라</li>
        </ul>
    );
}

export default function FamousSayingPost() {
    const Title = () => {
        return (
            <Link href="/post_list">
                <div className="font-serif text-xl text-black bg-white header-contents text-center py-3">
                    투자<span className='text-yellow-300'>.</span>격언
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
            {/* <ArticleTemplate title={`원칙 Principles`} subTitle={`🌵`} detail={<RayDalio />} img1={"https://image.yes24.com/goods/115381618/XL"} img2={"https://image.yes24.com/goods/61186169/XL"} img3={"https://image.aladin.co.kr/product/30493/69/letslook/K122830485_t2.jpg"} /> */}
            <ArticleTemplate title={`격언`} subTitle={<a href="https://namu.wiki/w/벤저민%20그레이엄">벤저민 그레이엄</a>} detail={<Graham />} img1={`https://upload.wikimedia.org/wikipedia/commons/2/2a/Benjamin_Graham_%281894-1976%29_portrait_on_23_March_1950.jpg`} img2={`https://learningspoons-lms-s3.s3.amazonaws.com/media/uploads/froala_editor/images/%EB%B2%A4%EC%A0%80%EB%AF%BC%20%EA%B7%B8%EB%A0%88%EC%9D%B4%EC%97%84-1-min.png`} img3={`https://image.yes24.com/goods/90299861/XL`} />
            <ArticleTemplate title={`격언`} subTitle={<a href="https://namu.wiki/w/워렌%20버핏">워렌 버핏</a>} detail={<Warren />} img1={`https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Warren_Buffett_KU_Visit.jpg/400px-Warren_Buffett_KU_Visit.jpg`} img2={``} img3={`https://blog.kakaocdn.net/dn/bjmbIF/btqD2cO6yWX/KznE0noSRyWLuUyPwtPbOK/img.png`} />

            {/* https://namu.wiki/w/벤저민%20그레이엄 */}
        </div>
    )
}