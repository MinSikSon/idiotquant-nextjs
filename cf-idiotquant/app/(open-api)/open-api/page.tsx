"use client"

import { reqPostWebSocket, reqPostToken, reqGetInquireBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { setKoreaInvestmentToken, KoreaInvestmentToken } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { getKoreaInvestmentApproval, getKoreaInvestmentToken } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button } from "@material-tailwind/react";
import React from "react";

export default function OpenApi() {
    const dispatch = useAppDispatch();
    const kiApproval = useAppSelector(getKoreaInvestmentApproval);
    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);

    React.useEffect(() => {
        // login check ?
        dispatch(reqPostWebSocket());

        const koreaInvestmentToken = localStorage.getItem('koreaInvestmentToken');
        console.log(`koreaInvestmentToken`, koreaInvestmentToken, typeof koreaInvestmentToken, !!koreaInvestmentToken);
        if (false == !!koreaInvestmentToken) {
            dispatch(reqPostToken()); // NOTE: 1분에 한 번씩만 token 발급 가능
        }
        else {
            const json = JSON.parse(koreaInvestmentToken);
            const currentDate = new Date();
            const expiredDate = new Date(json["access_token_token_expired"]);;
            const skipPostToken = (expiredDate > currentDate);
            // console.log(`skipPostToken`, skipPostToken, `currentDate:`, currentDate, `, expiredDate:`, expiredDate);
            if (false == skipPostToken) {
                dispatch(reqPostToken()); // NOTE: 1분에 한 번씩만 token 발급 가능
            }
            else {
                if (false == !!kiToken["access_token"]) {
                    dispatch(setKoreaInvestmentToken(json));
                }
            }
        }
    }, []);

    // console.log(`kiApproval`, kiApproval);

    function handleOnClick() {
        console.log(`kiToken`, kiToken);

        dispatch(reqGetInquireBalance(kiToken));
    }

    return <>
        <div className="flex flex-col">
            <div>OpenApi</div>
            {/* {kiApproval} */}
            {/* {kiToken} */}

            <Button onClick={() => handleOnClick()}>test</Button>
        </div>
    </>
}
