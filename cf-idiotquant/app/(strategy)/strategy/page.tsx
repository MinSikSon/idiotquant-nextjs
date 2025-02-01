"use client"

import { Web3Card2, Web3CardPropsType } from "@/components/topCreators2";
import { selectStockList } from "@/lib/features/strategy/strategySlice";
import { useAppSelector } from "@/lib/hooks";
import { getRandomMainImage, getRandomUserImage } from "@/app/(strategy)/strategy/image";

export default function Strategy() {
    const stockList = useAppSelector(selectStockList);
    console.log(`[Home] strategyList`, stockList, stockList.length);

    let propsList: Web3CardPropsType[] = [
        {
            name: 'NCAV',
            desc: 'Net-Current Asset Value',
            imgs: getRandomMainImage(),
            cardNum: '0',
            profileImg: getRandomUserImage(),
            summary: `저평가 주식 ${stockList.length > 0 ? stockList.length : `0`} 개를 추천합니다. 순유동자산 대비 시가총액이 얼마나 높은 지를 기준으로 합니다.`,
        },
        // {
        //     name: 'NCAV',
        //     desc: 'Net-Current Asset Value',
        //     imgs: getRandomMainImage(),
        //     cardNum: '1',
        //     profileImg: getRandomUserImage(),
        //     summary: '저평가 주식을 추천합니다. 순유동자산 대비 시가총액이 얼마나 높은 지를 기준으로 합니다.',
        // },
        // {
        //     name: 'NCAV',
        //     desc: 'Net-Current Asset Value',
        //     imgs: getRandomMainImage(2),
        //     cardNum: '2',
        //     profileImg: getRandomUserImage(2),
        //     summary: '저평가 주식을 추천합니다. 순유동자산 대비 시가총액이 얼마나 높은 지를 기준으로 합니다.',
        // },
        // {
        //     name: 'NCAV',
        //     desc: 'Net-Current Asset Value',
        //     imgs: getRandomMainImage(3),
        //     cardNum: '3',
        //     profileImg: getRandomUserImage(3),
        //     summary: '저평가 주식을 추천합니다. 순유동자산 대비 시가총액이 얼마나 높은 지를 기준으로 합니다.',
        // },
        // {
        //     name: 'NCAV',
        //     desc: 'Net-Current Asset Value',
        //     imgs: getRandomMainImage(4),
        //     cardNum: '4',
        //     profileImg: getRandomUserImage(4),
        //     summary: '저평가 주식을 추천합니다. 순유동자산 대비 시가총액이 얼마나 높은 지를 기준으로 합니다.',
        // },
        // {
        //     name: 'NCAV',
        //     desc: 'Net-Current Asset Value',
        //     imgs: getRandomMainImage(5),
        //     cardNum: '4',
        //     profileImg: getRandomUserImage(5),
        //     summary: '저평가 주식을 추천합니다. 순유동자산 대비 시가총액이 얼마나 높은 지를 기준으로 합니다.',
        // },
        // {
        //     name: 'NCAV',
        //     desc: 'Net-Current Asset Value',
        //     imgs: getRandomMainImage(6),
        //     cardNum: '4',
        //     profileImg: getRandomUserImage(6),
        //     summary: '저평가 주식을 추천합니다. 순유동자산 대비 시가총액이 얼마나 높은 지를 기준으로 합니다.',
        // }
    ];

    return <>
        {!!stockList ? <Web3Card2 title={'Strategy'} parentRouter={'strategy'} data={propsList} /> : <></>}
    </>
}

