"use client";

import { KakaoMessage, selectLoginState } from "@/lib/features/login/loginSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useEffect, useState } from "react";
import { getKoreaInvestmentBalance, getKoreaInvestmentToken, KoreaInvestmentBalance, KoreaInvestmentToken, reqGetInquireBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { getKoreaInvestmentUsMaretPresentBalance, KoreaInvestmentOverseasPresentBalance, reqGetOverseasStockTradingInquirePresentBalance } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";
import Auth from "@/components/auth";
import { isValidCookie, Util } from "@/components/util";
import { KakaoFeed, SendKakaoMessage } from "./report";
import Loading from "@/components/loading";
import { KakaoTotal, selectKakaoTatalState, selectKakaoTotal } from "@/lib/features/kakao/kakaoSlice";
import { queryTimestampList, selectTimestampList } from "@/lib/features/timestamp/timestampSlice";
import LoadKakaoTotal from "@/components/loadKakaoTotal";
import { selectCloudflare, UserInfo } from "@/lib/features/cloudflare/cloudflareSlice";

const DEBUG = false;

export default function Report() {
    const dispatch = useAppDispatch();

    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
    const kiBalanceKr: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);
    const kiBalanceUs: KoreaInvestmentOverseasPresentBalance = useAppSelector(getKoreaInvestmentUsMaretPresentBalance);

    const kakaoTotal: KakaoTotal = useAppSelector(selectKakaoTotal); // NOTE: authToken 이 발행 됐지만, login step skip된 경우 값 setting 안 됨.
    const timestampList = useAppSelector(selectTimestampList);

    const kakaoTotalState = useAppSelector(selectKakaoTatalState);
    const loginState = useAppSelector(selectLoginState);

    const cfUserInfo: UserInfo = useAppSelector(selectCloudflare);


    const [message, setMessage] = useState<KakaoMessage>({} as KakaoMessage);
    const [lock, setLock] = useState<boolean>(false);
    useEffect(() => {
        if (DEBUG) console.log(`[Report] isValidCookie("koreaInvestmentToken"):`, isValidCookie("koreaInvestmentToken"));
    }, []);
    useEffect(() => {
        if (DEBUG) console.log(`[Report] message`, message);
    }, [message]);
    useEffect(() => {
        if (DEBUG) console.log(`[Report] loginState`, loginState);
    }, [loginState]);
    useEffect(() => {
        if (DEBUG) console.log(`[Report] cfUserInfo`, cfUserInfo);
    }, [cfUserInfo]);

    useEffect(() => {
        if (DEBUG) console.log(`[Report]`, `kiToken:`, kiToken);
        if (false == lock) {
            if ("fulfilled" == kiToken?.state) {
                dispatch(reqGetInquireBalance(kiToken));
                dispatch(reqGetOverseasStockTradingInquirePresentBalance(kiToken));
                dispatch(queryTimestampList("5"));

                setLock(true);
            }
        }
    }, [kiToken]);
    useEffect(() => {
        if (DEBUG) console.log(`[Report]`, `kiBalanceKr:`, kiBalanceKr);
    }, [kiBalanceKr]);
    useEffect(() => {
        if (DEBUG) console.log(`[Report]`, `kiBalanceUs:`, kiBalanceUs);
    }, [kiBalanceUs]);
    useEffect(() => {
        if (DEBUG) console.log(`[Report]`, `timestampList:`, timestampList);
        if (timestampList?.state == "fulfilled") {

        }
    }, [timestampList]);

    useEffect(() => {
        if (DEBUG) console.log(`[Report]`, `kiBalanceKr`, kiBalanceKr);
        if (DEBUG) console.log(`[Report]`, `kiBalanceUs`, kiBalanceUs);
        if (DEBUG) console.log(`[Report]`, `kakaoTotal`, kakaoTotal);
        if (DEBUG) console.log(`[Report]`, `timestampList`, timestampList);
        if (DEBUG) console.log(`[Report]`, `cfUserInfo`, cfUserInfo);

        if (kiBalanceKr.state === "fulfilled" && kiBalanceUs.state === "fulfilled" && kakaoTotal?.id != 0 && timestampList?.state == "fulfilled" && cfUserInfo?.state == "fulfilled") {
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

            let date_diff = 0;
            let prev_index = 0;
            if (DEBUG) console.log(`[Report] timestampList.data.length:`, timestampList.data.length);
            if (timestampList.data.length >= 8) {
                prev_index = timestampList.data.length - 8;
                date_diff = 7;
            }
            else if (timestampList.data.length >= 2) {
                prev_index = timestampList.data.length - 2;
                date_diff = 1;
            }

            const prev_total_income_diff = timestampList.data[prev_index].value?.item_content?.sum_op;
            if (DEBUG) console.log(`[Report] prev_total_income_diff:`, prev_total_income_diff);
            const parts = prev_total_income_diff.split("%");
            let prev_total_income = 0; // 총 수익률 (%)
            if (parts.length >= 2) {
                prev_total_income = parts[0];
            }

            if (DEBUG) console.log(`[Report] prev_total_income:`, prev_total_income);

            let latest_total_income = Number(((evlu_amt_smtl_amt[COUNTRY.eKR] + evlu_amt_smtl_amt[COUNTRY.eUS]) / (pchs_amt_smtl_amt[COUNTRY.eKR] + pchs_amt_smtl_amt[COUNTRY.eUS]) * 100 - 100).toFixed(2)); // 총 수익률
            let diff_percentage = (Number(latest_total_income) - Number(prev_total_income)).toFixed(2);
            if (0 == Number(diff_percentage)) {
                diff_percentage = "변동 없음"
            }
            else {
                if (Number(diff_percentage) > 0) {
                    diff_percentage = "+" + diff_percentage + "%";
                }
                else {
                    diff_percentage = "-" + diff_percentage + "%";
                }
            }

            let total_income = `${latest_total_income}%(${diff_percentage})`; // 총 수익률 (%)
            if (DEBUG) console.log(`[Report] total_income:`, total_income);
            const newMessage: KakaoMessage = {
                object_type: "feed",
                content: {
                    title: `수익금:${Util.UnitConversion(evlu_amt_smtl_amt[COUNTRY.eKR] + evlu_amt_smtl_amt[COUNTRY.eUS] - pchs_amt_smtl_amt[COUNTRY.eKR] - pchs_amt_smtl_amt[COUNTRY.eUS], true)}`,
                    description: `매입금:${Util.UnitConversion(pchs_amt_smtl_amt[COUNTRY.eKR] + pchs_amt_smtl_amt[COUNTRY.eUS], true)}, 예수금:${Util.UnitConversion(dnca_tot_amt[COUNTRY.eKR] + dnca_tot_amt[COUNTRY.eUS], true)}`,
                    image_url: "https://cdn.pixabay.com/photo/2016/11/23/18/00/yosemite-national-park-1854097_1280.jpg",
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
                    profile_text: `${kakaoTotal?.kakao_account?.profile?.nickname}님 오늘의 리포트 입니다.`,
                    profile_image_url: cfUserInfo?.avatarUrl ?? "https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcQC204t6uH7yxBhAKuLIDmnkoH889H4CltDoKCyx62wGyv0n1hVglreFD0DYT3evs4GNc0xxVGM2dVnyPoa4LNBmlNoS8y44LtHmIRUUk7C",
                    title_image_url: "https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcQ8PwlYqDGozO1pGQfRbVXN0O5N036AFzK8CtVJ1mya3u6xj_9ChpHQBsSWA6hboAyIssBaROErkwuv7E25GIRY2V6a--8sD-0CcO_LBoF-",
                    title_image_text: "주간 부부투자",
                    title_image_category: "리포트",
                    items: [
                        { item: "KR 평가/매입", item_op: `${Util.UnitConversion(evlu_amt_smtl_amt[COUNTRY.eKR], true)} / ${Util.UnitConversion(pchs_amt_smtl_amt[COUNTRY.eKR], true)} (${(evlu_amt_smtl_amt[COUNTRY.eKR] / pchs_amt_smtl_amt[COUNTRY.eKR] * 100 - 100).toFixed(2)}%)` },
                        // { item: "KR 예수금", item_op: `${Util.UnitConversion(dnca_tot_amt[COUNTRY.eKR], true)}` },
                        { item: "KR 순자산", item_op: `${Util.UnitConversion(nass_amt[COUNTRY.eKR], true)}` },
                        { item: "US 평가/매입", item_op: `${Util.UnitConversion(evlu_amt_smtl_amt[COUNTRY.eUS], true)} / ${Util.UnitConversion(pchs_amt_smtl_amt[COUNTRY.eUS], true)} (${(evlu_amt_smtl_amt[COUNTRY.eUS] / pchs_amt_smtl_amt[COUNTRY.eUS] * 100 - 100).toFixed(2)}%)` },
                        // { item: "US 예수금", item_op: `${Util.UnitConversion(dnca_tot_amt[COUNTRY.eUS], true)}` },
                        { item: "US 순자산", item_op: `${Util.UnitConversion(nass_amt[COUNTRY.eUS], true)}` },
                    ],
                    sum: "총 수익률 (%)",
                    sum_op: total_income,
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

    useEffect(() => {
        if (DEBUG) console.log(`[Report] kakaoTotal:`, kakaoTotal);
        if (0 == kakaoTotal?.id) {

        }
    }, [kakaoTotal]);

    if (DEBUG) console.log(`[Report] kiToken:`, kiToken);
    if ("fulfilled" != kiToken?.state) {
        return <>
            <Auth />
            <div className="dark:bg-black h-lvh"></div>
        </>
    }


    if (DEBUG) console.log(`[Report] loginState`, loginState);
    if (DEBUG) console.log(`[Report] kiBalanceKr`, kiBalanceKr);
    if (DEBUG) console.log(`[Report] kiBalanceUs`, kiBalanceUs);
    if (DEBUG) console.log(`[Report] message`, message);
    if (kiBalanceKr.state !== "fulfilled" || kiBalanceUs.state !== "fulfilled" || undefined == message || Object.keys(message).length === 0) {
        return <>
            {("init" == kakaoTotalState) && <LoadKakaoTotal />}
            <Loading />
        </>
    }

    return <>
        {(kakaoTotal?.kakao_account?.profile?.nickname === process.env.NEXT_PUBLIC_MASTER) && <div className="pb-2"><SendKakaoMessage message={message} /></div>}
        <KakaoFeed message={message} />
    </>
}