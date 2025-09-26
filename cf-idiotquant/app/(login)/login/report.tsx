"use client";

import { useEffect, useState } from "react";
import { KakaoAccount, KakaoMessage, KakaoTotal, selectKakaoTotal, setKakaoMessage } from "@/lib/features/login/loginSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button } from "@material-tailwind/react";
import Auth from "@/components/auth";
import { isValidCookie, Util } from "@/components/util";
import { getKoreaInvestmentBalance, getKoreaInvestmentToken, KoreaInvestmentBalance, KoreaInvestmentToken, reqGetInquireBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { getKoreaInvestmentUsMaretPresentBalance, KoreaInvestmentOverseasPresentBalance, reqGetOverseasStockTradingInquirePresentBalance } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";

const DEBUG = false;

export default function Report() {
    const dispatch = useAppDispatch();

    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
    const kiBalanceKr: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);
    const kiBalanceUs: KoreaInvestmentOverseasPresentBalance = useAppSelector(getKoreaInvestmentUsMaretPresentBalance);

    const kakaoTotal: KakaoTotal = useAppSelector(selectKakaoTotal);

    const [message, setMessage] = useState<KakaoMessage>({} as KakaoMessage);
    const [validCookie, setValidCookie] = useState<any>(false);
    useEffect(() => {
        setValidCookie(isValidCookie("koreaInvestmentToken"));
    }, []);
    useEffect(() => {
        if (DEBUG) console.log(`[Report] message`, message);
    }, [message]);

    useEffect(() => {
        const isValidKiAccessToken = !!kiToken["access_token"];
        if (DEBUG) console.log(`[Report]`, `isValidKiAccessToken`, isValidKiAccessToken);
        if (true == isValidKiAccessToken) {
            dispatch(reqGetInquireBalance(kiToken));
            dispatch(reqGetOverseasStockTradingInquirePresentBalance(kiToken));
        }
    }, [kiToken]);
    // useEffect(() => {
    //     if (true == DEBUG) console.log(`[Report]`, `kiBalanceKr`, kiBalanceKr);
    // }, [kiBalanceKr]);

    useEffect(() => {
        if (kiBalanceKr.state === "fulfilled" && kiBalanceUs.state === "fulfilled") {
            if (DEBUG) console.log(`[Report]`, `kiBalanceKr`, kiBalanceKr);
            if (DEBUG) console.log(`[Report]`, `kiBalanceUs`, kiBalanceUs);
            if (DEBUG) console.log(`[Report]`, `kakaoTotal`, kakaoTotal);

            // const isUsBalance = !!props.kiBalance.output3;
            // evlu_amt_smtl_amt = (true == isUsBalance) ? props.kiBalance.output3["evlu_amt_smtl"] : props.kiBalance.output2[0]["evlu_amt_smtl_amt"];
            // evlu_amt_smtl_amt = Number(evlu_amt_smtl_amt);
            // pchs_amt_smtl_amt = (true == isUsBalance) ? props.kiBalance.output3["pchs_amt_smtl"] : props.kiBalance.output2[0]["pchs_amt_smtl_amt"];
            // pchs_amt_smtl_amt = Number(pchs_amt_smtl_amt);
            const COUNTRY = {
                eKR: 0,
                eUS: 1,
            };

            let evlu_amt_smtl_amt: number[] = [Number(kiBalanceKr.output2[0]["evlu_amt_smtl_amt"]), Number(kiBalanceUs.output3["evlu_amt_smtl"])]; // 평가금액
            let pchs_amt_smtl_amt: number[] = [Number(kiBalanceKr.output2[0]["pchs_amt_smtl_amt"]), Number(kiBalanceUs.output3["pchs_amt_smtl"])]; // 매입금액
            let dnca_tot_amt: number[] = [Number(kiBalanceKr.output2[0]["dnca_tot_amt"]), Number(kiBalanceUs.output3["frcr_use_psbl_amt"])]; // 예수금
            let nass_amt: number[] = [
                Number(evlu_amt_smtl_amt[COUNTRY.eKR]) + Number(dnca_tot_amt[COUNTRY.eKR]),
                Number(evlu_amt_smtl_amt[COUNTRY.eUS]) + Number(dnca_tot_amt[COUNTRY.eUS])
            ]; // 순자산

            const newMessage: KakaoMessage = {
                object_type: "feed",
                content: {
                    title: "골든 리트리버",
                    description: "강아지, 골댕이, 멍멍이",
                    image_url: "https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcQ8PwlYqDGozO1pGQfRbVXN0O5N036AFzK8CtVJ1mya3u6xj_9ChpHQBsSWA6hboAyIssBaROErkwuv7E25GIRY2V6a--8sD-0CcO_LBoF-",
                    image_width: 640,
                    image_height: 640,
                    link: {
                        web_url: "https://idiotquant.com/report",
                        mobile_web_url: "https://idiotquant.com/report",
                        android_execution_params: "contentId=100",
                        ios_execution_params: "contentId=100"
                    }
                },
                item_content: {
                    profile_text: `${kakaoTotal?.kakao_account?.profile?.nickname}님 오늘의 리포트 입니다. dfaskjfal;ksjfkl;sadjflkasdjfl;kadjfkl;adsjfkl;asdjfl;ajflasjdfkl;asjfkl;asjfk;lasjflasjfla;sjfls;ajflks;jflskflks;afjlas;fj;safjasfjasfjsafjsadl;kfjsal;fsajl;f`,
                    profile_image_url: "https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcQC204t6uH7yxBhAKuLIDmnkoH889H4CltDoKCyx62wGyv0n1hVglreFD0DYT3evs4GNc0xxVGM2dVnyPoa4LNBmlNoS8y44LtHmIRUUk7C",
                    title_image_url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ7fzLDFYamWLTE46n73joaDbqcOEV8WS1lfg&s",
                    title_image_text: "주간 부부투자",
                    title_image_category: "리포트",
                    items: [
                        { item: "KR 평가금액", item_op: `${Util.UnitConversion(evlu_amt_smtl_amt[COUNTRY.eKR], true)}` },
                        { item: "KR 매입금액", item_op: `${Util.UnitConversion(pchs_amt_smtl_amt[COUNTRY.eKR], true)}` },
                        { item: "KR 예수금", item_op: `${Util.UnitConversion(dnca_tot_amt[COUNTRY.eKR], true)}` },
                        { item: "KR 순자산", item_op: `${Util.UnitConversion(nass_amt[COUNTRY.eKR], true)}` },
                        { item: "US 평가금액", item_op: `${Util.UnitConversion(evlu_amt_smtl_amt[COUNTRY.eUS], true)}` },
                        { item: "US 매입금액", item_op: `${Util.UnitConversion(pchs_amt_smtl_amt[COUNTRY.eUS], true)}` },
                        { item: "US 예수금", item_op: `${Util.UnitConversion(dnca_tot_amt[COUNTRY.eUS], true)}` },
                        { item: "US 순자산", item_op: `${Util.UnitConversion(nass_amt[COUNTRY.eUS], true)}` },
                    ],
                    sum: "수익률 (%)",
                    sum_op: `${((evlu_amt_smtl_amt[COUNTRY.eKR] + evlu_amt_smtl_amt[COUNTRY.eUS]) / (pchs_amt_smtl_amt[COUNTRY.eKR] + pchs_amt_smtl_amt[COUNTRY.eUS]) * 100).toFixed(2)}%`,
                    // sum: "KR 평가금액/KR 매입금액",
                    // TODO: 지난주 대비 수익률
                    // TODO: 각 장 지수대비 수익률
                    // TODO: report page 들어오면 더 자세한 정보 볼 수 있도록..!
                },
                // social: {
                //     like_count: 100,
                //     comment_count: 200,
                //     shared_count: 300,
                //     view_count: 400,
                //     subscriber_count: 500
                // },
                buttons: [
                    {
                        title: "웹으로 이동",
                        link: {
                            web_url: "https://idiotquant.com/report",
                            mobile_web_url: "https://idiotquant.com/report"
                        }
                    },
                    // {
                    //     title: "앱으로 이동",
                    //     link: {
                    //         android_execution_params: "contentId=100",
                    //         ios_execution_params: "contentId=100"
                    //     }
                    // }
                ]
            };
            setMessage(newMessage);
        }
    }, [kiBalanceKr, kiBalanceUs, kakaoTotal]);

    if (false == validCookie || false == !!kiToken["access_token"]) {
        return <>
            <Auth />
            <div className="dark:bg-black h-lvh"></div>
        </>
    }

    function onClick() {
        if (DEBUG) console.log(`[Report] setKakaoMessage`);
        if (DEBUG) console.log(`[Report] message:`, message);

        dispatch(setKakaoMessage(message));
    }

    return <>
        <div className="flex flex-col dark:bg-black h-fit justify-center items-center">
            <span className="text-gray-500">Report page is under construction...</span>
            <Button onClick={onClick}>testSendKakaoMessage</Button>
        </div>
    </>
}