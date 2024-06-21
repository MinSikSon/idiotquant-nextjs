"use client"

import React from "react";
import { ArrowTrendingUpIcon, HomeIcon } from "@heroicons/react/24/outline";
import { ListItem, ListItemPrefix, ListItemSuffix } from "@material-tailwind/react";
import Link from "next/link";
import TemplateArticle from "../../components/TemplateArticle";
import TemplateArticleSimple from "../../components/TemplateArticleSimple";

export default function PostList(props) {
    const [contents, setContents] = React.useState([
        {
            title: '투자 격언',
            subTitle: '벤저민 그레이엄',
            link: 'https://namu.wiki/w/벤저민%20그레이엄',
            detail: [
                '청산가치가 시가총액보다 크면서 흑자인 기업에 투자하는 전략',
                '조건에 부합하는 종목 20~30 개 정도를 매수 하는 전략',
                '그러나 종목이 몇 개 없다면, 1개 기업에 내 자산의 최대 10% 만 투자하도록'
            ],
            img: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Benjamin_Graham_%281894-1976%29_portrait_on_23_March_1950.jpg'
        },
        {
            title: '투자 격언',
            subTitle: '워렌 버핏',
            link: 'https://namu.wiki/w/워렌%20버핏',
            detail: ['좋은 기업을 좋은 가격에 사라'],
            img: 'https://i.namu.wiki/i/8yRtr2VZPwEVHkgocxnABZ7eXJc1WAVdAYSchp-nn1DhKeDov15G08Jt3DOG9ahgrpo3ajQmvoxnO4YWJAKaAKXiBltQq5vYNw1swNaE50IwtTVIRwNWvi-ybu9quZ-tNW6hn0jG9-EOQ6ywcs64Aw.webp'
        },
        {
            title: '퀀트 용어',
            subTitle: '🌵',
            detail: [
                '계량투자 (퀀트투자): 수치만 보고 투자하는 방식',
                '투자스타일',
                [
                    '밸류 전략: 가치투자',
                    '퀄리티 전략: 우량주투자',
                    '모멘텀 전략: 추세투자',
                    '자산배분 전략: 주식, 채권, 현금 등에 자산을 배분',
                    '콤보 전략: 위 4개 전략 조합',
                ],
                '매출 총액 - 매출 원가 = 매출 이익',
                '매출 이익 - 판매 관리비 = 영업 이익',
            ],
            img: 'https://www.syesd.co.kr/homepage/syStoryImageFolder/1614817264026_fb8ff05cd5914f31981ff8aab95f8219_01.png'
        },
        {
            title: '기본 용어',
            subTitle: '🌵🌵',
            detail: [
                'CAGR: Compound Annual Growth Rate (연평균성장률)',
                'NCAV: Net Current Asset Value (순유동자산)',
                'MDD: Maximum Draw Down',
                '투자자의 "최대 고통"을 측정하는 지표.',
                '당기순이익: net income. 회사가 실제로 순수하게 남긴 이익',
                'DIV: Dividend Yield (배당수익률)',
                'BPS: Book-Per Share. 1 주 당 장부가',
                'PER: Price Earning Ratio. 1 주 당 얻는 수익을 비율로 나타냄.',
                'PER * EPS = 1 주 가격',
                'EPS: Earning Per Share. 1 주 당 수익금',
                'PBR: Price Book Ratio. 장부가 대비 1주 가격을 비율로 나타냄',
                'EV/EBIT: 몇 년 만에 투자 비용 회수할 수 있는지 알려주는 지표.',
                'EV: Enterprise Value. 기업가치. 실제 얼마를 투입하면 기업을 완전히 지배할 수 있는지 보여주는 지표.',
                [
                    'EV = 시가총액 + 부채 - 현금 - 비영업자산'
                ],
                'EBIT: Earning Before Interest and Taxes. 영업이익. 이자비용과 법인세 차감 전 이익.',
                'ROC: Return On Capital. ROC = EBIT(영업이익)/투자자본',
                '투자자본 = 고정자산+유동자산-유동부채',
                '고정자산 == 비유동자산',
                'GP/A = 매출총이익/총자산 = (매출액 - 매출원가) / (자기자본 + 대출(부채))',
                [
                    'GP/A: GP: Gross Prifit. 매출 총 이익. A: Assets. 총 자산.'
                ],
                'BS: Balance Sheet. 재무 상태표(대차 대조표)',
            ],
            img: 'https://www.syesd.co.kr/homepage/syStoryImageFolder/1614817264026_fb8ff05cd5914f31981ff8aab95f8219_01.png'
        },
        {
            title: '기타 용어',
            subTitle: '🌵🌵🌵',
            detail: [
                '매출 총액 - 매출 원가 = 매출 이익',
                '매출 이익 - 판매 관리비 = 영업 이익',
                '영업 이익 - 영업 이외의 활동으로 인한 손익 = 순이익',
                '영업 이외의 활동으로 인한 손익: 부동산, 증권, 환차 등의 손익',
                '상장 폐지 대상: 2013년 이후부터, 5년 연속 영업 이익 적자 기업.',
                '참고: IFRS 에서는 영업 이익에 1회성 처분 비용 포함 시키기도 함.',
                '제159조(사업보고서 등의 제출)',
                [
                    '① 주권상장법인, 그 밖에 대통령령으로 정하는 법인(이하 “사업보고서 제출대상법인”이라 한다)은 그 사업보고서를 각 사업연도 경과 후 90일 이내에 금융위원회와 거래소에 제출하여야 한다.',
                    '자본시장과 금융투자업에 관한 법률',
                ]
            ],
            img: 'https://www.syesd.co.kr/homepage/syStoryImageFolder/1614817264026_fb8ff05cd5914f31981ff8aab95f8219_01.png'
        },
    ]);

    const [selectedContentIndex, setSelectedContentIndex] = React.useState(-1);

    const Article = (props) => {
        const item = props.item;
        const index = props.index;
        const selectedContentIndex = props.selectedContentIndex;
        const setSelectedContentIndex = props.setSelectedContentIndex;

        // console.log(`selectedContentIndex`, selectedContentIndex, `item`, item);

        return (
            <div onClick={() => setSelectedContentIndex(index == selectedContentIndex ? -1 : index)}>
                {(selectedContentIndex == index) ?
                    <TemplateArticle
                        title={item.title}
                        subTitle={item.subTitle}
                        link={item.link}
                        detail={item.detail}
                        img1={item.img}
                    />
                    : <TemplateArticleSimple
                        title={item.title}
                        subTitle={item.subTitle}
                        link={item.link}
                        img1={item.img}
                    />}
            </div>
        );
    }

    return (
        <>
            {contents.map((item, index) =>
                <Article
                    key={index.toString()}
                    index={index}
                    item={item}
                    selectedContentIndex={selectedContentIndex}
                    setSelectedContentIndex={setSelectedContentIndex}
                />
            )}
        </>
    );
}