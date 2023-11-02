import Link from "next/link";
import Head from "next/head";
import ArticleTemplate from "./template";

const Etc = () => {
    return (
        <>
            <ul className='list-disc list-inside pb-4 text-xs'>
                <li>CAGR: Compound Annual Growth Rate (연평균성장률)</li>
                <li>NCAV: Net Current Asset Value (순유동자산)</li>
                <li>MDD: Maximum Draw Down</li>
                <li>투자자의 '최대 고통'을 측정하는 지표.</li>
                <li>당기순이익: net income. 회사가 실제로 순수하게 남긴 이익</li>
                <li>DIV: Dividend Yield (배당수익률)</li>
                <li>BPS: Book-Per Share. 1 주 당 장부가</li>
                <li>PER: Price Earning Ratio. 1 주 당 얻는 수익을 비율로 나타냄.</li>
                <li>PER * EPS = 1 주 가격</li>
                <li>EPS: Earning Per Share. 1 주 당 수익금</li>
                <li>PBR: Price Book Ratio. 장부가 대비 1주 가격을 비율로 나타냄</li>
                <li>EV/EBIT: 몇 년 만에 투자 비용 회수할 수 있는지 알려주는 지표.</li>
                <li>EV: Enterprise Value. 기업가치. 실제 얼마를 투입하면 기업을 완전히 지배할 수 있는지 보여주는 지표.</li>
                <li className="pl-4">EV = 시가총액 + 부채 - 현금 - 비영업자산</li>

                <li>EBIT: Earning Before Interest and Taxes. 영업이익. 이자비용과 법인세 차감 전 이익.</li>
                <li>ROC: Return On Capital. ROC = EBIT(영업이익)/투자자본</li>
                <li>투자자본 = 고정자산+유동자산-유동부채</li>
                <li>고정자산 == 비유동자산</li>

                <li>GP/A = 매출총이익/총자산 = (매출액 - 매출원가) / (자기자본 + 대출(부채))</li>
                <li className='pl-4'>GP/A: GP: Gross Prifit. 매출 총 이익. A: Assets. 총 자산.</li>

                <li>BS: Balance Sheet. 재무 상태표(대차 대조표)</li>
            </ul >
            <ul className='list-disc list-inside bg-gray-200 pb-4 text-xs'>
                <li>매출 총액 - 매출 원가 = 매출 이익</li>
                <li>매출 이익 - 판매 관리비 = 영업 이익</li>
                <li>영업 이익 - 영업 이외의 활동으로 인한 손익 = 순이익</li>
                <li>영업 이외의 활동으로 인한 손익: 부동산, 증권, 환차 등의 손익</li>
                <li>상장 폐지 대상: 2013년 이후부터, 5년 연속 영업 이익 적자 기업.</li>
                <li>참고: IFRS 에서는 영업 이익에 1회성 처분 비용 포함 시키기도 함.</li>
            </ul>

            <ul className='list-disc list-inside bg-gray-300 pb-4 text-xs'>
                <li>제159조(사업보고서 등의 제출)</li>
                <li className="pl-4">① 주권상장법인, 그 밖에 대통령령으로 정하는 법인(이하 “사업보고서 제출대상법인”이라 한다)은 그 사업보고서를 각 사업연도 경과 후 90일 이내에 금융위원회와 거래소에 제출하여야 한다.</li>
                <li className="pl-4"><a href='https://www.law.go.kr/법령/자본시장과%20금융투자업에%20관한%20법률/제159조'>자본시장과 금융투자업에 관한 법률</a></li>
            </ul>

            <ul className='list-disc list-inside bg-gray-300 pb-4 text-xs'>
                <li>제159조(사업보고서 등의 제출)</li>
            </ul>
        </>
    );
}

export default function EtcPost() {
    const Title = () => {
        return (
            <Link href="/post_list">
                <div className="font-serif text-xl text-black bg-white header-contents text-center py-3">
                    기타<span className='text-yellow-300'>.</span>글들
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
            <ArticleTemplate title={`기본 용어`} subTitle={`🌵`} detail={<Etc />} img1={`https://www.syesd.co.kr/homepage/syStoryImageFolder/1614817264026_fb8ff05cd5914f31981ff8aab95f8219_01.png`} img2={`https://i.ytimg.com/vi/7S5ZdmnXQyU/maxresdefault.jpg`} img3={"https://i.pinimg.com/736x/19/1a/ba/191aba7a077145d3a3bb6c5455c914af.jpg"} />
        </div>
    )
}