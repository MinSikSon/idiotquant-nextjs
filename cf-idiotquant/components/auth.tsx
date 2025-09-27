"use client"

import { getCookie, isValidCookie, registerCookie } from "@/components/util";
import { reqPostApprovalKey, reqPostToken, reqGetInquireBalance, KoreaInvestmentInquirePrice, getKoreaInvestmentInquirePrice, getKoreaInvestmentInquireDailyItemChartPrice, KoreaInvestmentInquireDailyItemChartPrice, getKoreaInvestmentBalanceSheet, KoreaInvestmentBalanceSheet } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { KoreaInvestmentApproval, KoreaInvestmentToken, KoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { setKoreaInvestmentToken } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { getKoreaInvestmentApproval, getKoreaInvestmentToken, getKoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
// import { selectLoginState } from "@/lib/features/login/loginSlice";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useState, useEffect } from "react";

import { usePathname } from "next/navigation";
import Loading from "@/components/loading";
import LoadKakaoTotal from "./loadKakaoTotal";

const DEBUG = false;

export default function Auth() {
    const pathname = usePathname();

    const dispatch = useAppDispatch();
    const kiApproval: KoreaInvestmentApproval = useAppSelector(getKoreaInvestmentApproval);
    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
    const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);
    const kiInquirePrice: KoreaInvestmentInquirePrice = useAppSelector(getKoreaInvestmentInquirePrice);
    const kiInquireDailyItemChartPrice: KoreaInvestmentInquireDailyItemChartPrice = useAppSelector(getKoreaInvestmentInquireDailyItemChartPrice);
    const kiBalanceSheet: KoreaInvestmentBalanceSheet = useAppSelector(getKoreaInvestmentBalanceSheet);

    const [time, setTime] = useState<any>('');
    // const loginState = useAppSelector(selectLoginState);

    const [complete, setComplete] = useState<boolean>(false);
    const [step, setStep] = useState<number>(0);
    const [validCookie, setValidCookie] = useState<any>(false);
    useEffect(() => {
        if (DEBUG) console.log(`[Auth]`, `kiApproval:`, kiApproval);
        if (DEBUG) console.log(`[Auth]`, `kiToken:`, kiToken);
        if (DEBUG) console.log(`[Auth]`, `kiBalance:`, kiBalance);
        if (DEBUG) console.log(`[Auth]`, `kiInquirePrice:`, kiInquirePrice);
        if (DEBUG) console.log(`[Auth]`, `kiInquireDailyItemChartPrice:`, kiInquireDailyItemChartPrice);
        if (DEBUG) console.log(`[Auth]`, `kiBalanceSheet:`, kiBalanceSheet);

        if (DEBUG) console.log(`[Auth]`, `validCookie:`, validCookie);
        if (false == validCookie) {
            setValidCookie(isValidCookie("koreaInvestmentToken"));
        }
    }, []);

    function reload(seq: any) {
        if (DEBUG) console.log(`[Auth]`, seq, `- 0`, `complete:`, complete);
        if (DEBUG) console.log(`[Auth]`, seq, `- 0`, `step:`, step);
        if (true == complete) {
            return;
        }
        // if (DEBUG) console.log(`[Auth]`, `loginState`, loginState);
        // if ("init" == loginState){
        //     if (DEBUG) console.log(`[Auth]`, seq, `- 1`, `loginState:`, loginState);
        //     return;
        // }

        if (DEBUG) console.log(`[Auth]`, seq, `- 2`, `kiApproval.state:`, kiApproval.state);
        if ("init" == kiApproval.state) {
            dispatch(reqPostApprovalKey());
            setStep(1);
            return;
        }

        const isValidKiAccessToken = !!kiToken["access_token"];
        if (DEBUG) console.log(`[Auth]`, seq, `- 3`, `kiApproval:`, kiApproval, `kiToken:`, kiToken, `isValidKiAccessToken:`, isValidKiAccessToken);
        if ("init" == kiBalance.state && "" != kiToken["access_token"]) {
            // if (true == isValidKiAccessToken) {
            dispatch(reqGetInquireBalance(kiToken));
            setStep(2);
            return;
        }

        if (false == validCookie) {
            if ("init" == kiBalance.state && "init" == kiToken.state && false == isValidKiAccessToken) {
                if (DEBUG) console.log(`[Auth]`, seq, `- 4`, `dispatch(reqPostToken())`);
                dispatch(reqPostToken()); // NOTE: 1분에 한 번씩만 token 발급 가능
                return;
            }
            else if ("pending" == kiToken.state) {
                setStep(3);
                return;
            }
            else if ("fulfilled" == kiToken.state) {
                if (DEBUG) console.log(`[Auth]`, seq, `- 5`, `registerCookie("koreaInvestmentToken", JSON.stringify(kiToken))`);
                registerCookie("koreaInvestmentToken", JSON.stringify(kiToken));
            }

            setStep(4);
        }

        const cookieKoreaInvestmentToken = getCookie("koreaInvestmentToken");
        const jsonCookieKoreaInvestmentToken = JSON.parse(cookieKoreaInvestmentToken);
        if (DEBUG) console.log(`[Auth]`, seq, `- 6`, `jsonCookieKoreaInvestmentToken:`, jsonCookieKoreaInvestmentToken);
        const json: KoreaInvestmentToken = jsonCookieKoreaInvestmentToken;
        const currentDate = new Date();
        setTime(currentDate);
        const expiredDate = new Date(json["access_token_token_expired"].replace(" ", "T"));
        const skipPostToken = (expiredDate > currentDate);
        if (DEBUG) console.log(`[Auth]`, seq, `- 7`, `skipPostToken:`, skipPostToken);
        if (false == skipPostToken) {
            if (DEBUG) console.log(`[Auth]`, seq, `- 8`, `expiredDate:`, expiredDate, `currentDate:`, currentDate);
            dispatch(reqPostToken());
        }
        else if (false == isValidKiAccessToken) {
            dispatch(setKoreaInvestmentToken(json));
        }

        if (DEBUG) console.log(`[Auth]`, seq, `- 9`, `kiInquirePrice:`, kiInquirePrice);
        if (DEBUG) console.log(`[Auth]`, seq, `- 10`, `kiInquireDailyItemChartPrice:`, kiInquireDailyItemChartPrice);
        if (DEBUG) console.log(`[Auth]`, seq, `- 11`, `kiBalanceSheet:`, kiBalanceSheet);

        if (false == complete) {
            setStep(5);
            setComplete(true);
        }
    }

    // useEffect(() => {
    //     reload('1');
    // }, [loginState]);
    useEffect(() => {
        reload('2');
    }, [kiApproval]);
    useEffect(() => {
        reload('3');
    }, [kiToken]);
    useEffect(() => {
        reload('4');
    }, [kiBalance]);
    useEffect(() => {
        reload('5');
    }, [validCookie]);

    return <>
        <Loading />
        <LoadKakaoTotal />
    </>
}