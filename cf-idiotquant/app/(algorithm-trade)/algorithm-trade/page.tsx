"use client"

import RegisterTemplate from "@/components/register_template";
import { Util } from "@/components/util";
import { selectCapitalToken, selectPurchageLog } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { reqGetCapitalToken, reqGetPurchaseLog } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button, ButtonGroup, Typography } from "@material-tailwind/react";
import Link from "next/link";

export default function AlgorithmTrade() {
    const dispatch = useAppDispatch();

    const capitalToken: any = useAppSelector(selectCapitalToken);

    // const purchageLog:any = useAppSelector(selectPurchageLog);

    function handleOnClick() {
        dispatch(reqGetCapitalToken());
    }
    console.log(`capitalToken`, capitalToken);
    console.log(`typeof capitalToken`, typeof capitalToken);

    if (false == !!capitalToken || Object.keys(capitalToken).length === 0) {
        return <>
            <Button onClick={handleOnClick}>trade log 출력</Button>
        </>
    }

    return <>
        <Button variant="outlined" className="pb-2" onClick={handleOnClick}>print trade log</Button>
        <div className="text-lg font-bold pb-2">
            capital_charge_rate: {capitalToken.capital_charge_rate}
        </div>
        <div className="text-lg font-bold leading-none pb-2">
            time_stamp: {Object.keys(capitalToken.time_stamp).map((key, index) => {
                return <div className="text-xs font-normal pl-2" key={index}>{key}: {JSON.stringify(capitalToken.time_stamp[key])}</div>
            })}
        </div>
        <div className="text-lg font-bold leading-none pb-2">
            stock_list:{Object.keys(capitalToken.stock_list).map((key, index) => {
                return <div className="text-xs font-normal pl-2" key={index}>{key}: {JSON.stringify(capitalToken.stock_list[key])}</div>
            })}
        </div>
        <div className="text-lg font-bold leading-none pb-2">
            purchase_log: {Object.keys(capitalToken.purchase_log).map((key, index) => {
                return <div className="text-xs font-normal pl-2" key={index}>{key}: {JSON.stringify(capitalToken.purchase_log[key])}</div>
            })}
        </div>
    </>
}