"use client"

import Login from "@/app/(login)/login/login";
import TablesExample8, { Example8TableHeadType, Example8TableRowType, TablesExample8PropsType } from "@/components/tableExample8";
import { Util } from "@/components/util";
import { reqPostApprovalKey, reqPostToken, reqGetInquireBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { KoreaInvestmentApproval, KoreaInvestmentToken, KoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { setKoreaInvestmentToken } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { getKoreaInvestmentApproval, getKoreaInvestmentToken, getKoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { selectState } from "@/lib/features/login/loginSlice";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button } from "@material-tailwind/react";
import React from "react";

export default function OpenApi() {
    const dispatch = useAppDispatch();
    const kiApproval: KoreaInvestmentApproval = useAppSelector(getKoreaInvestmentApproval);
    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
    const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);

    const [time, setTime] = React.useState<any>('');
    const loginState = useAppSelector(selectState);

    function reload(seq: any) {
        setTime(new Date());

        // login check ?
        if ("init" == kiApproval.state) {
            dispatch(reqPostApprovalKey());
        }

        console.log(`[OpenApi] ${seq}-1 kiToken`, kiToken);
        console.log(`[OpenApi] ${seq}-1 loginState`, loginState);
        const koreaInvestmentToken = localStorage.getItem('koreaInvestmentToken');
        // console.log(`koreaInvestmentToken`, koreaInvestmentToken, typeof koreaInvestmentToken, !!koreaInvestmentToken);
        if (false == !!koreaInvestmentToken) {
            if ("init" == kiBalance.state && "" == kiToken["access_token"]) {
                dispatch(reqPostToken()); // NOTE: 1분에 한 번씩만 token 발급 가능
            }
            else {
                localStorage.setItem('koreaInvestmentToken', JSON.stringify(kiToken));
            }
        }
        else {
            const json = JSON.parse(koreaInvestmentToken);
            // console.log(`json`, json);
            const currentDate = time;
            const expiredDate = new Date(json["access_token_token_expired"]);
            const skipPostToken = (expiredDate > currentDate);
            // console.log(`skipPostToken`, skipPostToken, `currentDate:`, currentDate, `, expiredDate:`, expiredDate);
            // if (false == skipPostToken) {
            //     dispatch(reqPostToken()); // NOTE: 1분에 한 번씩만 token 발급 가능
            // }
            // else
            {
                if (false == !!kiToken["access_token"]) {
                    dispatch(setKoreaInvestmentToken(json));
                }
            }
        }

        console.log(`[OpenApi] ${seq}-2 kiToken`, kiToken);
        console.log(`[OpenApi] ${seq}-2 loginState`, loginState);
        // if ("init" == kiBalance.state && "" != kiToken["access_token"] && "init" != loginState) {
        if ("" != kiToken["access_token"] && "init" != loginState) {
            dispatch(reqGetInquireBalance(kiToken));
        }
    }
    React.useEffect(() => {
        reload('1');
    }, [kiToken.state]);
    // React.useEffect(() => {
    //     reload('2');
    // }, [kiToken, loginState]);

    const example8TableHeadType: Example8TableHeadType[] = [
        {
            head: "종목명",
            // desc: "desc",
        },
        {
            head: "현재가",
        },
        {
            head: "보유수량/매도가능",
        },
        {
            head: "평가손익",
        },
        {
            head: "평가금액",
        },
        {
            head: "매수금액",
        },
        {
            head: "비중",
        },
    ];

    // console.log(`kiBalance.output1`, kiBalance.output1);
    let example8TableRowType: Example8TableRowType[] = [];
    if (!!kiBalance.output1 && kiBalance.output1.length > 0) {
        example8TableRowType = (kiBalance.output1.map((item, index) => {
            return {
                digitalAsset: item["prdt_name"],
                detail: item["prdt_name"],
                closePrice: Util.UnitConversion(Number(item["prpr"]), true),
                expectedRateOfReturn: `${item['hldg_qty']}/${item['ord_psbl_qty']}`,
                expectedRateOfReturnColor: '', // x
                targetPrice: Util.UnitConversion(Number(item["evlu_pfls_amt"]), true),
                market: Util.UnitConversion(Number(item["evlu_amt"]), true),
                netCurrentAssert: Util.UnitConversion(Number(item["pchs_amt"]), true),
                netIncome: `${(Number(item["pchs_amt"]) / Number(kiBalance.output2[0]["pchs_amt_smtl_amt"]) * 100).toFixed(2)} %`,
                chartName: '',
            }
            // {item["prdt_name"]} : 현재가{Util.UnitConversion(Number(item["prpr"]), true)} : 평가금액{Util.UnitConversion(Number(item["evlu_amt"]), true)} : 매수금액{Util.UnitConversion(Number(item["pchs_amt"]), true)}
        }));
    }

    // console.log(`example8TableRowType.length`, example8TableRowType.length);
    let nass_amt = ''; // 순자산
    let evlu_amt_smtl_amt = ''; // 평가금액
    let pchs_amt_smtl_amt = ''; // 매입금액
    let evlu_pfls_smtl_amt = '';// 수입
    if (!!kiBalance.output2 && kiBalance.output2.length > 0) {
        nass_amt = Util.UnitConversion(Number(kiBalance.output2[0]["nass_amt"]), true);
        evlu_amt_smtl_amt = Util.UnitConversion(Number(kiBalance.output2[0]["evlu_amt_smtl_amt"]), true);
        pchs_amt_smtl_amt = Util.UnitConversion(Number(kiBalance.output2[0]["pchs_amt_smtl_amt"]), true);
        evlu_pfls_smtl_amt = Util.UnitConversion(Number(kiBalance.output2[0]["evlu_pfls_smtl_amt"]), true);
    }
    const props: TablesExample8PropsType = {
        // title: `[OpenApi] 계좌 조회 (${kiBalance.ctx_area_fk100})`,
        title: `[OpenApi] 계좌 조회`,
        subTitle: ``,
        desc: `순자산금액: ${nass_amt} (수익금:${evlu_pfls_smtl_amt} = 평가금액:${evlu_amt_smtl_amt} - 매입금액:${pchs_amt_smtl_amt})`,
        // desc: ``,
        financial_date: '-',
        market_date: time.toString(),
        tableHead: example8TableHeadType,
        tableRow: example8TableRowType,
    }

    return <>
        {"init" == loginState ?
            <Login />
            :
            <TablesExample8 {...props} />
        }
    </>
}
