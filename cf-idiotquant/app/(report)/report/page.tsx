"use client";

import { KakaoMessage, selectLoginState } from "@/lib/features/login/loginSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useEffect, useState } from "react";
import { getKiInquireBalanceRlzPlResponseBody, getKoreaInvestmentBalance, getKoreaInvestmentToken, KiInquireBalanceRlzPlResponseBody, KoreaInvestmentBalance, KoreaInvestmentToken, reqGetInquireBalance, reqGetInquireBalanceRlzPl } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { getKiOverseasInquirePeriodProfitResponseBody, getKoreaInvestmentUsMaretPresentBalance, KiOverseasInquirePeriodProfitResponseBody, KoreaInvestmentOverseasPresentBalance, reqGetkiOverseasInquirePeriodProfit, reqGetOverseasStockTradingInquirePresentBalance } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";
import { KakaoFeed, SendKakaoMessage } from "./report";
import { KakaoTotal, selectKakaoTatalState, selectKakaoTotal } from "@/lib/features/kakao/kakaoSlice";
import { queryTimestampList, selectTimestampList } from "@/lib/features/timestamp/timestampSlice";
import LoadKakaoTotal from "@/components/loadKakaoTotal";
import { selectCloudflareUserInfo, UserInfo } from "@/lib/features/cloudflare/cloudflareSlice";
import { Spinner } from "@radix-ui/themes";
import { useSession } from "next-auth/react";

const DEBUG = false;

export default function Report() {
    const { data: session, status } = useSession();

    const dispatch = useAppDispatch();

    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
    const kiBalanceKr: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);
    const krKiBalanceRlzPl: KiInquireBalanceRlzPlResponseBody = useAppSelector(getKiInquireBalanceRlzPlResponseBody);

    const kiBalanceUs: KoreaInvestmentOverseasPresentBalance = useAppSelector(getKoreaInvestmentUsMaretPresentBalance);
    const usKiOverseasInquirePeriodProfit: KiOverseasInquirePeriodProfitResponseBody = useAppSelector(getKiOverseasInquirePeriodProfitResponseBody);

    const kakaoTotal: KakaoTotal = useAppSelector(selectKakaoTotal); // NOTE: authToken 이 발행 됐지만, login step skip된 경우 값 setting 안 됨.
    const timestampList = useAppSelector(selectTimestampList);

    const kakaoTotalState = useAppSelector(selectKakaoTatalState);
    const loginState = useAppSelector(selectLoginState);

    const cfUserInfo: UserInfo = useAppSelector(selectCloudflareUserInfo);

    const [message, setMessage] = useState<KakaoMessage>({} as KakaoMessage);
    useEffect(() => {
        if ("init" == kiBalanceKr.state) {
            dispatch(reqGetInquireBalance());
        }
        if ("init" == krKiBalanceRlzPl.state) {
            dispatch(reqGetInquireBalanceRlzPl());
        }
        if ("init" == kiBalanceUs.state) {
            dispatch(reqGetOverseasStockTradingInquirePresentBalance());
        }
        if ("init" == usKiOverseasInquirePeriodProfit.state) {
            dispatch(reqGetkiOverseasInquirePeriodProfit());
        }
        if ("init" == timestampList.state) {
            dispatch(queryTimestampList("5"));
        }
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
        if (DEBUG) console.log(`[Report]`, `kiBalanceKr:`, kiBalanceKr);
    }, [kiBalanceKr]);
    useEffect(() => {
        if (DEBUG) console.log(`[Report]`, `krKiBalanceRlzPl:`, krKiBalanceRlzPl);
    }, [krKiBalanceRlzPl]);
    useEffect(() => {
        if (DEBUG) console.log(`[Report]`, `kiBalanceUs:`, kiBalanceUs);
    }, [kiBalanceUs]);
    useEffect(() => {
        if (DEBUG) console.log(`[Report]`, `usKiOverseasInquirePeriodProfit:`, usKiOverseasInquirePeriodProfit);
    }, [usKiOverseasInquirePeriodProfit]);
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

        if (kiBalanceKr.state === "fulfilled" && kiBalanceUs.state === "fulfilled" && !!session?.user?.id && timestampList?.state == "fulfilled" && cfUserInfo?.state == "fulfilled") {
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
                    diff_percentage = diff_percentage + "%";
                }
            }

            let total_income = `${latest_total_income}%`; // 총 수익률 (%)
            if (DEBUG) console.log(`[Report] total_income:`, total_income);
            const newMessage: KakaoMessage = {
                object_type: "feed",
                content: {
                    title: `현재 수익금:₩${Number(evlu_amt_smtl_amt[COUNTRY.eKR] + evlu_amt_smtl_amt[COUNTRY.eUS] - pchs_amt_smtl_amt[COUNTRY.eKR] - pchs_amt_smtl_amt[COUNTRY.eUS]).toLocaleString()}`,
                    description: `매입금:₩${Number(pchs_amt_smtl_amt[COUNTRY.eKR] + pchs_amt_smtl_amt[COUNTRY.eUS]).toLocaleString()}, 예수금:₩${Number(dnca_tot_amt[COUNTRY.eKR] + dnca_tot_amt[COUNTRY.eUS]).toLocaleString()}`,
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
                    title_image_text: "요세미티 리트리버 투자클럽",
                    title_image_category: "리포트",
                    items: [
                        { item: "KR 평가/매입", item_op: `₩${Number(evlu_amt_smtl_amt[COUNTRY.eKR]).toLocaleString()} / ₩${Number(pchs_amt_smtl_amt[COUNTRY.eKR]).toLocaleString()} (${(evlu_amt_smtl_amt[COUNTRY.eKR] / pchs_amt_smtl_amt[COUNTRY.eKR] * 100 - 100).toFixed(2)}%)` },
                        // { item: "KR 예수금", item_op: `${Util.UnitConversion(dnca_tot_amt[COUNTRY.eKR], true)}` },
                        { item: "KR 순자산", item_op: `₩${Number(nass_amt[COUNTRY.eKR]).toLocaleString()}` },
                        { item: "US 평가/매입", item_op: `₩${Number(evlu_amt_smtl_amt[COUNTRY.eUS]).toLocaleString()} / ₩${Number(pchs_amt_smtl_amt[COUNTRY.eUS]).toLocaleString()} (${(evlu_amt_smtl_amt[COUNTRY.eUS] / pchs_amt_smtl_amt[COUNTRY.eUS] * 100 - 100).toFixed(2)}%)` },
                        // { item: "US 예수금", item_op: `${Util.UnitConversion(dnca_tot_amt[COUNTRY.eUS], true)}` },
                        { item: "US 순자산", item_op: `₩${Number(nass_amt[COUNTRY.eUS]).toLocaleString()}` },
                    ],
                    sum: "현재 수익률 (%)",
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
    }, [kakaoTotal]);

    if (DEBUG) console.log(`[Report] loginState`, loginState);
    if (DEBUG) console.log(`[Report] kiBalanceKr`, kiBalanceKr);
    if (DEBUG) console.log(`[Report] kiBalanceUs`, kiBalanceUs);
    if (DEBUG) console.log(`[Report] message`, message);
    if (kiBalanceKr.state !== "fulfilled" || kiBalanceUs.state !== "fulfilled" || undefined == message || Object.keys(message).length === 0) {
        return <>
            {("init" == kakaoTotalState) && <LoadKakaoTotal />}
            <Spinner loading />
        </>
    }

    return <>
        {(session?.user?.name === process.env.NEXT_PUBLIC_MASTER) && <div className="pb-2"><SendKakaoMessage message={message} /></div>}
        <KakaoFeed message={message} />
    </>
}