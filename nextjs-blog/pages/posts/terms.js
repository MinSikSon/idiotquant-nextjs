import Link from "next/link";

const RayDalio = () => {
    return (
        <ul className='list-disc list-outside'>
            <li>역사는 반복된다</li>
            <li>1980년 3월, 은 가격 폭락. 시기가 중요하다.</li>
            <li>브리지워터</li>
        </ul>
    );
}

const Article = (props) => {
    const title = props.title;
    const subTitle = props.subTitle;
    const detail = props.detail;

    return (
        <div className="py-6 px-4 sm:p-6 md:py-10 md:px-8">
            <div className="max-w-4xl mx-auto grid grid-cols-1 lg:max-w-5xl lg:gap-x-20 lg:grid-cols-2">
                <div className="relative p-3 col-start-1 row-start-1 flex flex-col-reverse rounded-lg bg-gradient-to-t from-black/75 via-black/0 sm:bg-none sm:row-start-2 sm:p-0 lg:row-start-1">
                    <h1 className="mt-1 text-lg font-semibold text-white sm:text-slate-900 md:text-2xl dark:sm:text-white">{title}</h1>
                    <div className="text-sm leading-4 font-medium text-white sm:text-slate-500 dark:sm:text-slate-400">{subTitle}</div>
                </div>
                <div className="grid gap-4 col-start-1 col-end-3 row-start-1 sm:mb-6 sm:grid-cols-4 lg:gap-6 lg:col-start-2 lg:row-end-6 lg:row-span-6 lg:mb-0">
                    <img src={props.img1} alt="" className="w-full h-60 object-cover rounded-lg sm:h-52 sm:col-span-2 lg:col-span-full" loading="lazy" />
                    <img src={props.img2} alt="" className="hidden w-full h-52 object-cover rounded-lg sm:block sm:col-span-2 md:col-span-1 lg:row-start-2 lg:col-span-2 lg:h-32" loading="lazy" />
                    <img src={props.img3} alt="" className="hidden w-full h-52 object-cover rounded-lg md:block lg:row-start-2 lg:col-span-2 lg:h-32" loading="lazy" />
                </div>
                <div className="mt-4 col-start-1 row-start-3 self-center sm:mt-0 sm:col-start-2 sm:row-start-2 sm:row-span-2 lg:mt-6 lg:col-start-1 lg:row-start-3 lg:row-end-4">
                    {/* <button type="button" className="bg-indigo-600 text-white text-sm leading-6 font-medium py-2 px-3 rounded-lg">Check availability</button> */}
                </div>
                <div className="mt-4 text-sm leading-6 col-start-1 sm:col-span-2 lg:mt-6 lg:row-start-4 lg:col-span-1 bg-gray-100 rounded-lg">
                    {detail}
                </div>
            </div>
        </div>
    );
}


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

            <ul className='list-disc list-outside bg-gray-300 pb-4'>
                <li>제159조(사업보고서 등의 제출)</li>
            </ul>

        </div>
    );
}


const Etc = () => {
    return (
        <>
            <ul className='list-disc list-outside pb-4'>
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
                <li>EV/EBIT: 몇 년 만에 내가 투자한 비용을 회수할 수 있는지를 알려주는 지표.</li>
                <li>EV: Enterprise Value. 기업가치. 실제 얼마를 투입하면 기업을 완전히 지배할 수 있는지 보여주는 지표.</li>
                <ul className='list-disc list-inside'>
                    <li>EV = 시가총액 + 부채 - 현금 - 비영업자산</li>
                </ul>

                <li>EBIT: Earning Before Interest and Taxes. 영업이익. 이자비용과 법인세 차감 전 이익.</li>
                <li>ROC: Return On Capital. ROC = EBIT(영업이익)/투자자본</li>
                <li>투자자본 = 고정자산+유동자산-유동부채</li>
                <li>고정자산 == 비유동자산</li>

                <li>GP/A = 매출총이익/총자산 = (매출액 - 매출원가) / (자기자본 + 대출(부채))</li>
                <ul className='list-disc list-inside'>
                    <li>GP/A: GP: Gross Prifit. 매출 총 이익. A: Assets. 총 자산.</li>
                </ul>

                <li>BS: Balance Sheet. 재무 상태표(대차 대조표)</li>
            </ul >
            <ul className='list-disc list-outside bg-gray-200 pb-4'>
                <li>매출 총액 - 매출 원가 = 매출 이익</li>
                <li>매출 이익 - 판매 관리비 = 영업 이익</li>
                <li>영업 이익 - 영업 이외의 활동으로 인한 손익 = 순이익</li>
                <li>영업 이외의 활동으로 인한 손익: 부동산, 증권, 환차 등의 손익</li>
                <li>상장 폐지 대상: 2013년 이후부터, 5년 연속 영업 이익 적자 기업.</li>
                <li>참고: IFRS 에서는 영업 이익에 1회성 처분 비용 포함 시키기도 함.</li>
            </ul>

            <ul className='list-disc list-outside bg-gray-300 pb-4'>
                <li>제159조(사업보고서 등의 제출)</li>
                <ul className='list-disc list-inside'>
                    <li>① 주권상장법인, 그 밖에 대통령령으로 정하는 법인(이하 “사업보고서 제출대상법인”이라 한다)은 그 사업보고서를 각 사업연도 경과 후 90일 이내에 금융위원회와 거래소에 제출하여야 한다.</li>
                    <li><a href='https://www.law.go.kr/법령/자본시장과%20금융투자업에%20관한%20법률/제159조'>자본시장과 금융투자업에 관한 법률</a></li>
                </ul>
            </ul>

        </>
    );
}

const Terms = () => {
    return (
        <>
            <ul className='list-disc list-outside'>
                <li>알파: 적극적인 위험 노출. 다른 사람들과 다른 방향으로 투자해 생기는 이익.
                    <ul className='list-disc list-inside'>
                        <li>포지티브 알파: 시장수익률을 웃도는 경우.</li>
                        <li>네거티브 알파: 시장수익률보다 낮은 경우.</li>
                        <li>알파 오버레이: ?</li>
                    </ul>
                </li>
                <li>베타: 수동적인 위험 노출. 시장의 수익률(예를 들면 주식시장 등)</li>
            </ul>
        </>
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

export default function TermsPost() {
    const Title = () => {
        return (
            <Link href="/">
                <div className="font-serif text-2xl text-black bg-white header-contents text-center">
                    IDIOT<span className='text-yellow-300'>.</span>QUANT
                </div>
            </Link>
        );
    };
    return (
        <div>
            <Title />
            <Article title={`원칙 Principles`} subTitle={`🌵`} detail={<RayDalio />} img1={"https://image.yes24.com/goods/115381618/XL"} img2={"https://image.yes24.com/goods/61186169/XL"} img3={"https://image.aladin.co.kr/product/30493/69/letslook/K122830485_t2.jpg"} />
            <Article title={`퀀트 용어`} subTitle={`🌵`} detail={<Quant />} img1={`https://www.syesd.co.kr/homepage/syStoryImageFolder/1614817264026_fb8ff05cd5914f31981ff8aab95f8219_01.png`} img2={`https://i.ytimg.com/vi/7S5ZdmnXQyU/maxresdefault.jpg`} img3={"https://i.pinimg.com/736x/19/1a/ba/191aba7a077145d3a3bb6c5455c914af.jpg"} />
            <Article title={`기본 용어`} subTitle={`🌵`} detail={<Etc />} img1={`https://www.syesd.co.kr/homepage/syStoryImageFolder/1614817264026_fb8ff05cd5914f31981ff8aab95f8219_01.png`} img2={`https://i.ytimg.com/vi/7S5ZdmnXQyU/maxresdefault.jpg`} img3={"https://i.pinimg.com/736x/19/1a/ba/191aba7a077145d3a3bb6c5455c914af.jpg"} />
            <Article title={`기본 용어 2`} subTitle={`🌵`} detail={<Terms />} img1={`https://www.syesd.co.kr/homepage/syStoryImageFolder/1614817264026_fb8ff05cd5914f31981ff8aab95f8219_01.png`} img2={`https://i.ytimg.com/vi/7S5ZdmnXQyU/maxresdefault.jpg`} img3={"https://i.pinimg.com/736x/19/1a/ba/191aba7a077145d3a3bb6c5455c914af.jpg"} />
            <Article title={`격언`} subTitle={<a href="https://namu.wiki/w/벤저민%20그레이엄">벤저민 그레이엄</a>} detail={<Graham />} img1={`https://upload.wikimedia.org/wikipedia/commons/2/2a/Benjamin_Graham_%281894-1976%29_portrait_on_23_March_1950.jpg`} img2={`https://learningspoons-lms-s3.s3.amazonaws.com/media/uploads/froala_editor/images/%EB%B2%A4%EC%A0%80%EB%AF%BC%20%EA%B7%B8%EB%A0%88%EC%9D%B4%EC%97%84-1-min.png`} img3={`https://image.yes24.com/goods/90299861/XL`} />
            <Article title={`격언`} subTitle={<a href="https://namu.wiki/w/워렌%20버핏">워렌 버핏</a>} detail={<Warren />} img1={`https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Warren_Buffett_KU_Visit.jpg/400px-Warren_Buffett_KU_Visit.jpg`} img2={``} img3={`https://blog.kakaocdn.net/dn/bjmbIF/btqD2cO6yWX/KznE0noSRyWLuUyPwtPbOK/img.png`} />

            {/* https://namu.wiki/w/벤저민%20그레이엄 */}
        </div>
    )
}