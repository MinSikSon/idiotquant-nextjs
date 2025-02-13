"use client"

import Login from "@/app/(login)/login/login";
import TablesExample8, { Example8TableHeadType, Example8TableRowType, TablesExample8PropsType } from "@/components/tableExample8";
import { getCookie, isValidCookie, registerCookie, Util } from "@/components/util";
import { reqPostApprovalKey, reqPostToken, reqGetInquireBalance, reqPostOrderCash, reqGetInquirePrice, KoreaInvestmentInquirePrice, getKoreaInvestmentInquirePrice, reqGetInquireDailyItemChartPrice, getKoreaInvestmentInquireDailyItemChartPrice, KoreaInvestmentInquireDailyItemChartPrice, reqGetBalanceSheet, getKoreaInvestmentBalanceSheet, KoreaInvestmentBalanceSheet } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { KoreaInvestmentApproval, KoreaInvestmentToken, KoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { setKoreaInvestmentToken } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { getKoreaInvestmentApproval, getKoreaInvestmentToken, getKoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { selectState } from "@/lib/features/login/loginSlice";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button, Input, Typography } from "@material-tailwind/react";
import React from "react";

import { usePathname } from "next/navigation";

export default function Auth() {
    const pathname = usePathname();

    const dispatch = useAppDispatch();
    const kiApproval: KoreaInvestmentApproval = useAppSelector(getKoreaInvestmentApproval);
    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
    const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);
    const kiInquirePrice: KoreaInvestmentInquirePrice = useAppSelector(getKoreaInvestmentInquirePrice);
    const kiInquireDailyItemChartPrice: KoreaInvestmentInquireDailyItemChartPrice = useAppSelector(getKoreaInvestmentInquireDailyItemChartPrice);
    const kiBalanceSheet: KoreaInvestmentBalanceSheet = useAppSelector(getKoreaInvestmentBalanceSheet);

    const [time, setTime] = React.useState<any>('');
    const loginState = useAppSelector(selectState);

    function reload(seq: any) {
        let count = 0;
        if ("init" == loginState) {
            console.log(`[Auth]`, seq, `-`, count++, `loginState:`, loginState);
            return;
        }

        if ("init" == kiApproval.state) {
            console.log(`[Auth]`, seq, `-`, count++, `kiApproval.state:`, kiApproval.state);
            dispatch(reqPostApprovalKey());
            return;
        }

        const isValidKiAccessToken = !!kiToken["access_token"];
        console.log(`[Auth]`, seq, `-`, count++, `loginState:`, loginState, `kiApproval:`, kiApproval, `kiToken:`, kiToken, `isValidKiAccessToken:`, isValidKiAccessToken);
        // if ("init" == kiBalance.state && "" != kiToken["access_token"]) {
        if (true == isValidKiAccessToken) {
            dispatch(reqGetInquireBalance(kiToken));
            return;
        }

        if (false == isValidCookie("koreaInvestmentToken")) {
            if ("init" == kiBalance.state && "init" == kiToken.state && false == isValidKiAccessToken) {
                console.log(`[Auth]`, seq, `-`, count++, `dispatch(reqPostToken())`);
                dispatch(reqPostToken()); // NOTE: 1분에 한 번씩만 token 발급 가능
            }
            else if ("fulfilled" == kiToken.state) {
                console.log(`[Auth]`, seq, `-`, count++, `registerCookie("koreaInvestmentToken", JSON.stringify(kiToken))`);
                registerCookie("koreaInvestmentToken", JSON.stringify(kiToken));
            }

            return;
        }

        const cookieKoreaInvestmentToken = getCookie("koreaInvestmentToken");
        const jsonCookieKoreaInvestmentToken = JSON.parse(cookieKoreaInvestmentToken);
        console.log(`[Auth]`, seq, `-`, count++, `jsonCookieKoreaInvestmentToken:`, jsonCookieKoreaInvestmentToken);
        const json: KoreaInvestmentToken = jsonCookieKoreaInvestmentToken;
        const currentDate = new Date();
        setTime(currentDate);
        const expiredDate = new Date(json["access_token_token_expired"].replace(" ", "T"));
        const skipPostToken = (expiredDate > currentDate);
        console.log(`[Auth]`, seq, `-`, count++, `skipPostToken:`, skipPostToken);
        if (false == skipPostToken) {
            console.log(`[Auth]`, seq, `-`, count++, `expiredDate:`, expiredDate, `currentDate:`, currentDate);
            dispatch(reqPostToken());
        }
        else if (false == isValidKiAccessToken) {
            dispatch(setKoreaInvestmentToken(json));
        }

        console.log(`[Auth]`, seq, `-`, count++, `kiInquirePrice:`, kiInquirePrice);
        console.log(`[Auth]`, seq, `-`, count++, `kiInquireDailyItemChartPrice:`, kiInquireDailyItemChartPrice);
        console.log(`[Auth]`, seq, `-`, count++, `kiBalanceSheet:`, kiBalanceSheet);
    }

    React.useEffect(() => {
        reload('1');
    }, [loginState]);
    React.useEffect(() => {
        reload('2');
    }, [kiApproval]);
    React.useEffect(() => {
        reload('3');
    }, [kiToken]);


    return <>
        <Button className="border-0 bg-none" variant="outlined" loading={true}>loading</Button>
    </>
}