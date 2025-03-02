import { Button } from "@material-tailwind/react";
import { DesignButton } from "./designButton";
import TablesExample8, { Example8TableHeadType, Example8TableRowType, TablesExample8PropsType } from "./tableExample8";
import { Util } from "./util";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import React from "react";

interface InquireBalanceResultProps {
    time: any;
    kiBalance: any;
    reqGetInquireBalance: any;
    kiToken: any;
    kiOrderCash: any;
    reqPostOrderCash: any;
}

export default function InquireBalanceResult(props: InquireBalanceResultProps) {
    const dispatch = useAppDispatch();
    const [show, setShow] = React.useState<boolean>(false);
    const [msg, setMsg] = React.useState<any>("");
    const [orderName, setOrderName] = React.useState<any>("");

    const showAlert = (additionalMsg: string) => {
        setMsg(additionalMsg);
        setShow(true);

        setTimeout(() => {
            setShow(false);
        }, 3000);
    };

    function handleOnClick(item: any, buyOrSell: string) {
        if ("buy" == buyOrSell || "sell" == buyOrSell) {
            const korBuyOrSell = "buy" == buyOrSell ? "구매" : "판매";
            setOrderName(item["prdt_name"] + " " + korBuyOrSell + " 시도");
            dispatch(props.reqPostOrderCash({ koreaInvestmentToken: props.kiToken, PDNO: item["pdno"], buyOrSell: buyOrSell }));
            showAlert("");
        }
    }

    const example8TableHead: Example8TableHeadType[] = [
        {
            head: "",
            desc: "",
        },
        {
            head: "종목명",
            desc: "종목명",
        },
        {
            head: "현재가",
            desc: "현재가",
        },
        {
            head: "보유/주문가능",
            desc: "보유/주문가능",
        },
        {
            head: "평가손익",
            desc: "평가손익",
        },
        {
            head: "평가금액",
            desc: "평가금액",
        },
        {
            head: "매수금액",
            desc: "매수금액",
        },
        {
            head: "비중",
            desc: "비중",
        },
    ];

    let example8TableRow: Example8TableRowType[] = [];
    if ("fulfilled" == props.kiBalance.state) {
        let kiBalanceOutput1 = [...props.kiBalance.output1];
        // console.log(`kiBalanceOutput1`, kiBalanceOutput1);
        example8TableRow = (kiBalanceOutput1.sort((a, b) => Number(b["pchs_amt"]) - Number(a["pchs_amt"])).map((item, index) => {
            // console.log(`item["prdt_name"]`, item["prdt_name"], `item["prdt_name"].length`, item["prdt_name"].length);
            return {
                id: item["prdt_name"],
                column_1: <>
                    <div className="flex p-0 m-0 gap-1 font-mono">
                        <DesignButton
                            handleOnClick={() => handleOnClick(item, "buy")}
                            buttonName="buy"
                            buttonBgColor={`bg-green-500`}
                            buttonBorderColor={`border-green-400`}
                            buttonShadowColor={`#129600`}
                            textStyle={`text-white font-bold text-[0.5rem]`}
                            buttonStyle={`flex items-center justify-center mb-2 px-1 button rounded-full cursor-pointer select-none
                                active:translate-y-1 active:[box-shadow:0_0px_0_0_#129600,0_0px_0_0_#12960041] active:border-b-[0px]
                                transition-all duration-150 [box-shadow:0_4px_0_0_#129600,0_8px_0_0_#12960041] border-b-[1px]
                                `}
                        />
                        <DesignButton
                            handleOnClick={() => handleOnClick(item, "sell")}
                            buttonName="sell"
                            buttonBgColor={`bg-red-400`}
                            buttonBorderColor={`border-red-300`}
                            buttonShadowColor={`#910000`}
                            textStyle={`text-white font-bold text-[0.5rem]`}
                            buttonStyle={`flex items-center justify-center mb-2 px-1 button bg-red-400 rounded-full cursor-pointer select-none
                                active:translate-y-1 active:[box-shadow:0_0px_0_0_#910000,0_0px_0_0_#91000041] active:border-b-[0px]
                                transition-all duration-150 [box-shadow:0_4px_0_0_#910000,0_8px_0_0_#91000041] border-b-[1px]
                                `}
                        />
                    </div>
                </>,
                column_2: <div className={`font-mono ${item["prdt_name"].length >= 7 ? "text-[0.6rem]" : "text-xs"}`}>{item["prdt_name"]}</div>,
                column_3: <div className="font-mono font-bold text-xs text-black">{Number(item["prpr"]).toLocaleString() + "원"}</div>,
                column_4: <div className="font-mono text-xs text-black">{item['hldg_qty']}/{item['ord_psbl_qty']}</div>,
                expectedRateOfReturnColor: '', // x
                column_5: <div className={`font-mono font-bold text-xs flex justify-between ${Number(Number(item["evlu_amt"]) / Number(item["pchs_amt"]) * 100 - 100) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                    <div className="font-mono pr-1">
                        ({Number(Number(item["evlu_amt"]) / Number(item["pchs_amt"]) * 100 - 100).toFixed(2)}%)
                    </div>
                    <div>
                        {Util.UnitConversion(Number(item["evlu_pfls_amt"]), true)}
                    </div>
                </div>,
                column_6: <div className="text-xs font-mono text-black">{Util.UnitConversion(Number(item["evlu_amt"]), true)}</div>,
                column_7: <div className="text-xs font-mono text-black">{Util.UnitConversion(Number(item["pchs_amt"]), true)}</div>,
                column_8: <div className="text-xs font-mono font-bold text-black">{(Number(item["pchs_amt"]) / Number(props.kiBalance.output2[0]["pchs_amt_smtl_amt"]) * 100).toFixed(2)} %</div>,
            }
        }));
    }

    // console.log(`kiOrderCash.msg1`, kiOrderCash.msg1); // TODO: 클릭한 종목 바로 밑에 msg 뜨게 변경..!!

    let nass_amt: number = 0; // 순자산
    let evlu_amt_smtl_amt: number = 0; // 평가금액
    let pchs_amt_smtl_amt: number = 0; // 매입금액
    let evlu_pfls_smtl_amt: number = 0;// 수입
    if (!!props.kiBalance.output2 && props.kiBalance.output2.length > 0) {
        nass_amt = Number(props.kiBalance.output2[0]["nass_amt"]);
        evlu_amt_smtl_amt = Number(props.kiBalance.output2[0]["evlu_amt_smtl_amt"]);
        pchs_amt_smtl_amt = Number(props.kiBalance.output2[0]["pchs_amt_smtl_amt"]);
        evlu_pfls_smtl_amt = Number(props.kiBalance.output2[0]["evlu_pfls_smtl_amt"]);
    }
    const tablesExample8Props: TablesExample8PropsType = {
        title: <>
            <div className="flex pb-2 items-center">
                <div className="pr-2 text-black">알고리즘 매매 계좌 조회</div>
                <DesignButton
                    handleOnClick={() => {
                        showAlert("지난 주문 확인");
                        dispatch(props.reqGetInquireBalance(props.kiToken));
                    }}
                    buttonName="계좌 조회"
                    buttonBgColor="bg-white"
                    buttonBorderColor="border-black"
                    buttonShadowColor="#D5D5D5"
                    textStyle="text-black text-xs font-bold"
                    buttonStyle={`rounded-lg px-2 py-1 ml-2 flex items-center justify-center mb-2 button bg-white cursor-pointer select-none
                        active:translate-y-1 active:[box-shadow:0_0px_0_0_#D5D5D5,0_0px_0_0_#D5D5D541] active:border-[0px]
                        transition-all duration-150 [box-shadow:0_4px_0_0_#D5D5D5,0_8px_0_0_#D5D5D541] border-[1px]
                        `}
                />
                {"pending" == props.kiBalance.state ?
                    <Button loading={true} className="p-0 px-1 m-0 bg-white text-black font-mono">loading...</Button>
                    : <></>}
            </div>
        </>,
        subTitle: ``,
        desc: <>
            <div className="text-lg font-mono text-black leading-none pb-3">
                평가손익:<span className={`${(Number(evlu_amt_smtl_amt) / Number(pchs_amt_smtl_amt) * 100 - 100) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                    {Number(evlu_pfls_smtl_amt).toLocaleString()}원
                    ({pchs_amt_smtl_amt == 0 ? "-" : Number(Number(evlu_amt_smtl_amt / pchs_amt_smtl_amt) * 100 - 100).toFixed(2)}%)
                </span>
            </div>
            <div className="text-xs font-mono text-black p-3 border rounded">
                <div className="leading-none pb-2">
                    예수금액:{Number(Number(nass_amt) - Number(pchs_amt_smtl_amt)).toLocaleString()}원 순자산금액:{Number(nass_amt).toLocaleString()}원
                </div>
                <div className="leading-none pb-2">
                    평가금액:{Number(evlu_amt_smtl_amt).toLocaleString()}원
                </div>
                <div className="leading-none pb-1">
                    매입금액:{Number(pchs_amt_smtl_amt).toLocaleString()}원
                </div>
            </div>
        </>,
        financial_date: "",
        market_date: <div className="flex flex-col">
            <div className="text-xs">market_date: {props.time.toString()}</div>
        </div>,
        tableHead: example8TableHead,
        tableRow: example8TableRow,
    }

    return <>
        <div className={`border border-black text-center w-80 z-10 fixed top-32 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg text-white shadow-lg shadow-blue-gray-500 transition-all duration-500 ${show ? "opacity-100 scale-100 bg-green-500" : "opacity-0 scale-95 pointer-events-none"}`}>
            <div className="">{msg}</div>
            <div className="text-lg">✅ {orderName}</div>
            <div className="">{props.kiOrderCash.msg1}</div>
        </div>

        <TablesExample8 {...tablesExample8Props} />
    </>
}