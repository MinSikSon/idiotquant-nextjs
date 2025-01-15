"use client"

import { Web3Card2, Web3CardPropsType } from "@/components/topCreators2";
import { selectStrategyList } from "@/lib/features/strategy/strategySlice";
import { useAppSelector } from "@/lib/hooks";

export default function Strategy() {
    function getRandomMainImage(idx: any = undefined) {
        const imageList: string[] = [
            'https://www.investopedia.com/thmb/cOymT7ainOZSwk5xh7KmI0CfRME=/750x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/Stock_source-d84b531c2d3441a7a0611e8af4d9d750.jpg',
            'https://upload.wikimedia.org/wikipedia/commons/1/1e/Vereinigte_Ostindische_Compagnie_bond_-_Middelburg_-_Amsterdam_-_1622.jpg',
            'https://cdn.pixabay.com/photo/2016/11/18/18/37/sacks-1836329_1280.jpg',
            'https://cdn.pixabay.com/photo/2024/01/06/02/44/ai-generated-8490532_1280.png',
            'https://cdn.pixabay.com/photo/2019/11/10/12/35/sheep-4615685_1280.jpg',

        ];
        if (undefined == idx) {
            idx = Math.floor(Math.random() * imageList.length);
        }
        else {
            idx = idx % imageList.length;
        }
        return imageList[idx];
    }
    function getRandomUserImage(idx: any = undefined) {
        const imageList: string[] = [
            'https://cdn.pixabay.com/photo/2021/11/12/03/04/woman-6787784_1280.png',
            'https://cdn.pixabay.com/photo/2022/02/04/03/06/woman-6991826_1280.png',
            'https://cdn.pixabay.com/photo/2023/10/25/17/21/anxiety-8340943_640.png',
            'https://cdn.pixabay.com/photo/2023/11/27/20/29/autumn-8416137_1280.png',
            'https://cdn.pixabay.com/photo/2013/07/12/14/45/apollo-148722_1280.png',
            'https://cdn.pixabay.com/photo/2023/10/30/20/45/ai-generated-8353780_1280.png',

        ];
        if (undefined == idx) {
            idx = Math.floor(Math.random() * imageList.length);
        }
        else {
            idx = idx % imageList.length;
        }
        return imageList[idx];
    }

    const strategyList = useAppSelector(selectStrategyList);
    // console.log(`[Home] strategyList`, strategyList, strategyList.length);

    let propsList: Web3CardPropsType[] = [
        {
            name: 'NCAV',
            desc: 'Net-Current Asset Value',
            imgs: getRandomMainImage(0),
            cardNum: '0',
            profileImg: getRandomUserImage(0),
            summary: '저평가 주식을 추천합니다. 순유동자산 대비 시가총액이 얼마나 높은 지를 기준으로 합니다.',
        },
        {
            name: 'NCAV',
            desc: 'Net-Current Asset Value',
            imgs: getRandomMainImage(1),
            cardNum: '1',
            profileImg: getRandomUserImage(1),
            summary: '저평가 주식을 추천합니다. 순유동자산 대비 시가총액이 얼마나 높은 지를 기준으로 합니다.',
        },
        {
            name: 'NCAV',
            desc: 'Net-Current Asset Value',
            imgs: getRandomMainImage(2),
            cardNum: '2',
            profileImg: getRandomUserImage(2),
            summary: '저평가 주식을 추천합니다. 순유동자산 대비 시가총액이 얼마나 높은 지를 기준으로 합니다.',
        },
        {
            name: 'NCAV',
            desc: 'Net-Current Asset Value',
            imgs: getRandomMainImage(3),
            cardNum: '3',
            profileImg: getRandomUserImage(3),
            summary: '저평가 주식을 추천합니다. 순유동자산 대비 시가총액이 얼마나 높은 지를 기준으로 합니다.',
        },
        {
            name: 'NCAV',
            desc: 'Net-Current Asset Value',
            imgs: getRandomMainImage(4),
            cardNum: '4',
            profileImg: getRandomUserImage(4),
            summary: '저평가 주식을 추천합니다. 순유동자산 대비 시가총액이 얼마나 높은 지를 기준으로 합니다.',
        }
    ];

    return <>
        {!!strategyList ? <Web3Card2 title={'Strategy'} parentRouter={'strategy'} data={propsList} /> : <></>}
    </>
}

