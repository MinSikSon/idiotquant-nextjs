import { Button } from "@material-tailwind/react";
import { DesignButton } from "./designButton";
import TablesExample8, { Example8TableHeadType, Example8TableRowType, TablesExample8PropsType } from "./tableExample8";
import { Util } from "./util";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import React from "react";

interface InquireBalanceResultProps {
    kiBalance: any;
    reqGetInquireBalance: any;
    kiToken: any;
    kiOrderCash?: any;
    reqPostOrderCash?: any;
}

export default function InquireBalanceResult(props: InquireBalanceResultProps) {
    console.log(`[InquireBalanceResult]`, `props`, props);

    const dispatch = useAppDispatch();
    const [show, setShow] = React.useState<boolean>(false);
    const [msg, setMsg] = React.useState<any>("");
    const [orderName, setOrderName] = React.useState<any>("");

    const [time, setTime] = React.useState<any>(new Date());

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

    const [selectHead, setSelectHead] = React.useState("비중");

    const example8TableHead: Example8TableHeadType[] = [
        {
            head: "종목명",
        },
        {
            head: "현재가",
        },
        {
            head: "평단가",
        },
        {
            head: "평가손익",
        },
        {
            head: "비중",
        },
        {
            head: "평가금액",
        },
        {
            head: "매수금액",
        },
        {
            head: "보유/주문가능",
        },
        {
            head: "매매",
        },
    ];

    // console.log(`selectHead`, selectHead);

    let example8TableRow: Example8TableRowType[] = [];
    if ("fulfilled" == props.kiBalance.state) {
        let kiBalanceOutput1 = [...props.kiBalance.output1];
        // console.log(`kiBalanceOutput1`, kiBalanceOutput1);
        example8TableRow = (kiBalanceOutput1.sort((a, b) => {
            if ("종목명" == selectHead) {

                return String(a.prdt_name ?? a.ovrs_item_name).localeCompare(String(b.prdt_name ?? b.ovrs_item_name), "ko-KR");
            }
            if ("현재가" == selectHead) {
                return Number(b.prpr ?? b.now_pric2) - Number(a.prpr ?? a.now_pric2);
            }
            if ("평단가" == selectHead) {
                return Number(b.evlu_amt) / Number(b.hldg_qty) - Number(a.evlu_amt) / Number(a.hldg_qty);
            }
            if ("평가손익" == selectHead) {
                return Number(b.evlu_pfls_amt) - Number(a.evlu_pfls_amt);
            }
            if ("평가금액" == selectHead) {
                return Number(b.evlu_amt) - Number(a.evlu_amt);
            }
            if ("매수금액" == selectHead) {
                return Number(b.pchs_amt) - Number(a.pchs_amt);
            }
            if ("비중" == selectHead) {
                return Number(b.pchs_amt) - Number(a.pchs_amt);
            }
            if ("보유/주문가능" == selectHead) {
                return Number(b.hldg_qty) - Number(a.hldg_qty);
            }
            return 0;
        }).map((item, index) => {
            // console.log(`item["prdt_name"]`, item["prdt_name"], `item["prdt_name"].length`, item["prdt_name"].length);
            const name = item["prdt_name"];
            const price = !!item["prpr"] ? item["prpr"] : item["ovrs_now_pric1"];
            const pchs_amt = !!item["pchs_amt"] ? item["pchs_amt"] : item["frcr_pchs_amt"];
            const hldg_qty = !!item["hldg_qty"] ? item["hldg_qty"] : item["ccld_qty_smtl1"];
            const ord_psbl_qty = !!item['ord_psbl_qty'] ? item['ord_psbl_qty'] : item["ord_psbl_qty1"];
            const evlu_amt = !!item["evlu_amt"] ? item["evlu_amt"] : item["frcr_evlu_amt2"];
            const pchs_amt_smtl_amt = !!props.kiBalance.output3 ? props.kiBalance.output3["pchs_amt_smtl_amt"] : props.kiBalance.output2[0]["pchs_amt_smtl_amt"];

            const evlu_pfls_amt2 = !!item["evlu_pfls_amt2"] ? item["evlu_pfls_amt2"] : item["evlu_pfls_amt"];
            return {
                id: name,
                column_1: <div className={`font-mono ${name.length >= 7 ? "text-[0.6rem]" : "text-xs"}`}>{name}</div>,
                column_2: <div className="font-mono font-bold text-xs text-black">{Number(Number(price).toFixed(0)).toLocaleString() + "원"}</div>,
                column_3: <div className="font-mono font-bold text-xs text-black">{Number((Number(pchs_amt) / Number(hldg_qty)).toFixed(2)).toLocaleString() + "원"}</div>,
                column_4: <div className={`font-mono font-bold text-xs flex justify-between ${Number(Number(evlu_amt) / Number(pchs_amt) * 100 - 100) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                    <div className="font-mono pr-1 text-[0.6rem]">
                        ({Number(Number(evlu_amt) / Number(pchs_amt) * 100 - 100).toFixed(2)}%)
                    </div>
                    <div>
                        {Util.UnitConversion(Number(evlu_pfls_amt2), true)}
                    </div>
                </div>,
                column_5: <div className="text-xs font-mono font-bold text-black">{(Number(pchs_amt) / Number(pchs_amt_smtl_amt) * 100).toFixed(2)}%</div>,
                column_6: <div className="text-xs font-mono text-black">{Util.UnitConversion(Number(evlu_amt), true)}</div>,
                column_7: <div className="text-xs font-mono text-black">{Util.UnitConversion(Number(pchs_amt), true)}</div>,
                column_8: <div className="font-mono text-xs text-black">{Number(hldg_qty).toFixed(0)}/{Number(ord_psbl_qty).toFixed(0)}</div>,
                column_9: <>
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
                            textStyle={`text-white font-bold text-[0.4rem]`}
                            buttonStyle={`flex items-center justify-center mb-2 px-1 button bg-red-400 rounded-full cursor-pointer select-none
                            active:translate-y-1 active:[box-shadow:0_0px_0_0_#910000,0_0px_0_0_#91000041] active:border-b-[0px]
                            transition-all duration-150 [box-shadow:0_4px_0_0_#910000,0_8px_0_0_#91000041] border-b-[1px]
                            `}
                        />
                    </div>
                </>,
            }
        }));
    }

    // console.log(`kiOrderCash.msg1`, kiOrderCash.msg1); // TODO: 클릭한 종목 바로 밑에 msg 뜨게 변경..!!

    let nass_amt: number = 0; // 순자산
    let evlu_amt_smtl_amt: number = 0; // 평가금액
    let pchs_amt_smtl_amt: number = 0; // 매입금액
    let evlu_pfls_smtl_amt: number = 0;// 수입
    // if (!!props.kiBalance.output2 && props.kiBalance.output2.length > 0) {
    if ("fulfilled" == props.kiBalance.state) {
        // nass_amt = Number(props.kiBalance.output2[0]["nass_amt"]);
        nass_amt = !!props.kiBalance.output3 ? props.kiBalance.output3["frcr_evlu_tota"] : props.kiBalance.output2[0]["nass_amt"];
        nass_amt = Number(nass_amt);
        // evlu_amt_smtl_amt = Number(props.kiBalance.output2[0]["evlu_amt_smtl_amt"]);
        evlu_amt_smtl_amt = !!props.kiBalance.output3 ? props.kiBalance.output3["evlu_amt_smtl_amt"] : props.kiBalance.output2[0]["evlu_amt_smtl_amt"];
        evlu_amt_smtl_amt = Number(evlu_amt_smtl_amt);
        // pchs_amt_smtl_amt = Number(props.kiBalance.output2[0]["pchs_amt_smtl_amt"]);
        pchs_amt_smtl_amt = !!props.kiBalance.output3 ? props.kiBalance.output3["pchs_amt_smtl_amt"] : props.kiBalance.output2[0]["pchs_amt_smtl_amt"];
        pchs_amt_smtl_amt = Number(pchs_amt_smtl_amt);

        // evlu_pfls_smtl_amt = Number(props.kiBalance.output2[0]["evlu_pfls_smtl_amt"]);
        evlu_pfls_smtl_amt = !!props.kiBalance.output3 ? props.kiBalance.output3["evlu_pfls_amt_smtl"] : props.kiBalance.output2[0]["evlu_pfls_smtl_amt"];
        evlu_pfls_smtl_amt = Number(evlu_pfls_smtl_amt);
    }

    const tablesExample8Props: TablesExample8PropsType = {
        msg: props.kiBalance.msg1,
        title: <>
            <div className="flex pb-2 items-center">
                <DesignButton
                    handleOnClick={() => {
                        showAlert("지난 주문 확인");
                        setTime(new Date());

                        dispatch(props.reqGetInquireBalance(props.kiToken));
                    }}
                    buttonName="알고리즘 매매 계좌 조회"
                    buttonBgColor="bg-white"
                    buttonBorderColor="border-gray-500"
                    buttonShadowColor="#D5D5D5"
                    textStyle="text-black text-xs"
                    buttonStyle={`rounded-lg px-2 py-1 flex items-center justify-center mb-2 button bg-white cursor-pointer select-none
                        active:translate-y-1 active:[box-shadow:0_0px_0_0_#D5D5D5,0_0px_0_0_#D5D5D541] active:border-[0px]
                        transition-all duration-150 [box-shadow:0_4px_0_0_#D5D5D5,0_8px_0_0_#D5D5D541] border-[1px]
                        `}
                />
                {"pending" == props.kiBalance.state ?
                    <Button loading={true} className="p-0 px-1 m-0 bg-white text-black font-mono">loading...</Button>
                    : <>
                        <div className="font-mono text-[0.6rem] text-black ml-4">{time.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</div>
                    </>}
            </div>
        </>,
        desc: <>
            <div className="text-lg font-mono text-black leading-none pb-3">
                평가손익:<span className={`${(Number(evlu_amt_smtl_amt) / Number(pchs_amt_smtl_amt) * 100 - 100) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                    {Number(evlu_pfls_smtl_amt).toLocaleString()}원
                    ({pchs_amt_smtl_amt == 0 ? "-" : Number(Number(evlu_amt_smtl_amt / pchs_amt_smtl_amt) * 100 - 100).toFixed(2)}%)
                </span>
            </div>
            <div className="text-xs font-mono text-black p-3 border rounded">
                <div className="leading-none pb-2">
                    매입금액:{Number(pchs_amt_smtl_amt).toLocaleString()}원 평가금액:<span className={`${Number(evlu_amt_smtl_amt) > Number(pchs_amt_smtl_amt) ? "text-red-500" : "text-blue-500"}`}>{Number(evlu_amt_smtl_amt).toLocaleString()}원</span>
                </div>
                <div className="leading-none pb-0">
                    예수금액:{Number(Number(nass_amt) - Number(pchs_amt_smtl_amt)).toLocaleString()}원 순자산금액:{Number(nass_amt).toLocaleString()}원
                </div>
            </div>
        </>,
        tableHead: example8TableHead,
        selectHead: selectHead,
        setSelectHead: setSelectHead,

        tableRow: example8TableRow,
    }

    return <>
        <div className={`border border-black text-center w-80 z-10 fixed top-32 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg text-white shadow-lg shadow-blue-gray-500 transition-all duration-500 ${show ? "opacity-100 scale-100 bg-green-500" : "opacity-0 scale-95 pointer-events-none"}`}>
            <div className="">{msg}</div>
            <div className="text-lg">✅ {orderName}</div>
            <div className="">{!!props.kiOrderCash ? props.kiOrderCash.msg1 : ""}</div>
        </div>

        <TablesExample8 {...tablesExample8Props} />
    </>
}