import { Button, Spinner } from "@material-tailwind/react";
import { DesignButton } from "./designButton";
import TablesExample8, { Example8TableHeadType, Example8TableRowType, TablesExample8PropsType } from "./tableExample8";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import React from "react";
import { Util } from "./util";

const DEBUG = false;
function formatNumber(num: number) {
    return num % 1 === 0 ? num.toLocaleString() : num.toFixed(2);
}
interface InquireBalanceResultProps {
    kiBalance: any;
    reqGetInquireBalance: any;
    kiToken: any;
    kiOrderCash?: any;
    reqPostOrderCash?: any;
    stock_list?: any;
}

export default function InquireBalanceResult(props: InquireBalanceResultProps) {
    if (DEBUG) console.log(`[InquireBalanceResult]`, `props`, props);

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
            const excg_cd = !!item["ovrs_excg_cd"] ? item["ovrs_excg_cd"] : "";
            const frst_bltn_exrt = !!props.kiBalance.output2 ? props.kiBalance.output2[0]["frst_bltn_exrt"] : 1;
            let price = !!item["prpr"] ? item["prpr"] : item["ovrs_now_pric1"];
            price = price / frst_bltn_exrt;

            setOrderName(item["prdt_name"] + " " + korBuyOrSell + " 시도" + "(" + formatNumber(Number(price)) + `${(1 != frst_bltn_exrt) ? "USD" : ""}` + ")");
            dispatch(props.reqPostOrderCash({ koreaInvestmentToken: props.kiToken, PDNO: item["pdno"], buyOrSell: buyOrSell, excg_cd: excg_cd, price: price }));
            showAlert("");
        }
    }

    const [selectHead, setSelectHead] = React.useState("비중");
    const [prevSelectHead, setPrevSelectHead] = React.useState("");

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
            head: "수익률",
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
        {
            head: "시가총액",
        },
        {
            head: "EPS",
        },
        {
            head: "PER",
        },
        {
            head: "BPS",
        },
        {
            head: "PBR",
        },
    ];

    if (DEBUG) console.log(`selectHead`, selectHead);

    let example8TableRow: Example8TableRowType[] = [];
    if ("fulfilled" == props.kiBalance.state) {
        let kiBalanceOutput1 = [...props.kiBalance.output1];
        if (DEBUG) console.log(`kiBalanceOutput1`, kiBalanceOutput1);
        example8TableRow = (kiBalanceOutput1.sort((a, b) => {
            if ("종목명" == selectHead) {
                if (prevSelectHead == selectHead) {
                    return String(b.prdt_name ?? b.ovrs_item_name).localeCompare(String(a.prdt_name ?? a.ovrs_item_name), "ko-KR");
                }
                return String(a.prdt_name ?? a.ovrs_item_name).localeCompare(String(b.prdt_name ?? b.ovrs_item_name), "ko-KR");
            }

            let cond_a = 0;
            let cond_b = 0;
            if ("현재가" == selectHead) {
                cond_a = Number(a.prpr ?? a.ovrs_now_pric1);
                cond_b = Number(b.prpr ?? b.ovrs_now_pric1);
            }
            else if ("평단가" == selectHead) {
                cond_a = Number(a.evlu_amt ?? a.frcr_evlu_amt2) / Number(a.hldg_qty ?? a.ccld_qty_smtl1);
                cond_b = Number(b.evlu_amt ?? b.frcr_evlu_amt2) / Number(b.hldg_qty ?? b.ccld_qty_smtl1);
            }
            else if ("수익률" == selectHead) {
                cond_a = Number(a.evlu_amt ?? a.frcr_evlu_amt2) / Number(a.pchs_amt ?? a.frcr_pchs_amt);
                cond_b = Number(b.evlu_amt ?? b.frcr_evlu_amt2) / Number(b.pchs_amt ?? b.frcr_pchs_amt);
            }
            else if ("평가손익" == selectHead) {
                cond_a = Number(a.evlu_pfls_amt2 ?? a.evlu_pfls_amt);
                cond_b = Number(b.evlu_pfls_amt2 ?? b.evlu_pfls_amt);
            }
            else if ("평가금액" == selectHead) {
                cond_a = Number(a.evlu_amt ?? a.frcr_evlu_amt2);
                cond_b = Number(b.evlu_amt ?? b.frcr_evlu_amt2);
            }
            else if ("매수금액" == selectHead || "비중" == selectHead) {
                cond_a = Number(a.pchs_amt ?? a.frcr_pchs_amt);
                cond_b = Number(b.pchs_amt ?? b.frcr_pchs_amt);
            }
            else if ("보유/주문가능" == selectHead) {
                cond_a = Number(a.hldg_qty ?? a.ccld_qty_smtl1);
                cond_b = Number(b.hldg_qty ?? b.ccld_qty_smtl1);
            }

            return (prevSelectHead == selectHead) ? cond_a - cond_b : cond_b - cond_a;
        }).map((item, index) => {
            // if (DEBUG) console.log(`item["prdt_name"]`, item["prdt_name"], `item["prdt_name"].length`, item["prdt_name"].length);
            const name = item["prdt_name"];
            const pdno = item["pdno"];
            const price = !!item["prpr"] ? item["prpr"] : item["ovrs_now_pric1"];
            // const crcy_cd = !!props.kiBalance.output2[0]["crcy_cd"] ? <span className="text-[0.6rem]">{"" + props.kiBalance.output2[0]["crcy_cd"]}</span> : <span className="text-[0.6rem]">{"원"}</span>;
            const crcy_cd = <span className="text-[0.6rem]">{"원"}</span>;
            const pchs_amt = !!item["pchs_amt"] ? item["pchs_amt"] : item["frcr_pchs_amt"];
            const hldg_qty = !!item["hldg_qty"] ? item["hldg_qty"] : item["ccld_qty_smtl1"];
            const ord_psbl_qty = !!item['ord_psbl_qty'] ? item['ord_psbl_qty'] : item["ord_psbl_qty1"];
            const evlu_amt = !!item["evlu_amt"] ? item["evlu_amt"] : item["frcr_evlu_amt2"];
            const pchs_amt_smtl_amt = !!props.kiBalance.output3 ? props.kiBalance.output3["pchs_amt_smtl"] : props.kiBalance.output2[0]["pchs_amt_smtl_amt"];

            const evlu_pfls_amt2 = !!item["evlu_pfls_amt2"] ? item["evlu_pfls_amt2"] : item["evlu_pfls_amt"];

            const frst_bltn_exrt = !!props.kiBalance.output2 ? props.kiBalance.output2[0]["frst_bltn_exrt"] : 0;

            const stock_info = !!props.stock_list ? props.stock_list.filter((stock: any) => stock.PDNO == pdno) : [];
            // console.log(name, pdno, `stock_info`, stock_info);

            let eps = 0;
            let per = 0;
            let bps = 0;
            let pbr = 0;
            let hts_avls = 0;
            let stck_prpr = 0;
            let lstn_stcn = 1;
            if (stock_info.length > 0) {
                const inquire_price = stock_info[0]["output_inquirePrice"]["output"];
                eps = inquire_price["eps"] ? inquire_price["eps"] : Number(inquire_price["epsx"]) * frst_bltn_exrt;
                per = inquire_price["per"] ? inquire_price["per"] : inquire_price["perx"];
                bps = inquire_price["bps"] ? inquire_price["bps"] : Number(inquire_price["bpsx"]) * frst_bltn_exrt;
                pbr = inquire_price["pbr"] ? inquire_price["pbr"] : inquire_price["pbrx"];

                hts_avls = Number(inquire_price["hts_avls"]) * 100000000; // HTS 시가총액
                stck_prpr = inquire_price["stck_prpr"] ? inquire_price["stck_prpr"] : Number(inquire_price["last"]) * frst_bltn_exrt;// 현재가
                lstn_stcn = inquire_price["lstn_stcn"] ? inquire_price["lstn_stcn"] : inquire_price["shar"]; // 상장주식수
                // const balance_sheet = stock_info[0]["output_balanceSheet"]["output"][0];
            }

            return {
                id: name,
                column_1: <>
                    <div className="font-mono flex flex-col text-xs dark:text-white">
                        <div className="flex gap-1">
                            <div className="text-[0.5rem]">{index}</div>
                            <div className={`${name.length >= 7 ? "text-[0.6rem]" : "text-xs"}`}>{name}</div>
                        </div>
                        <div className="text-[0.5rem]">({pdno})</div>
                    </div>
                </>,
                column_2: <>
                    <div className="font-mono flex flex-col font-bold text-xs dark:text-white">
                        <div className="mb-0 pb-0">
                            {Number(Number(price).toFixed(0)).toLocaleString()}{crcy_cd}
                        </div>
                        <div className="text-right text-[0.5rem]">
                            {!!frst_bltn_exrt ? <span>({formatNumber(Number(price) / Number(frst_bltn_exrt))} USD)</span> : ""}
                        </div>
                    </div>
                </>,
                column_3: <>
                    <div className="font-mono flex flex-col text-xs dark:text-white">
                        <div className="mb-0 pb-0">
                            {Number((Number(pchs_amt) / Number(hldg_qty)).toFixed(0)).toLocaleString()}{crcy_cd}
                        </div>
                        <div className="text-right text-[0.5rem]">
                            {!!frst_bltn_exrt ? <span>({formatNumber((Number(pchs_amt) / Number(hldg_qty) / Number(frst_bltn_exrt)))} USD)</span> : ""}
                        </div>
                    </div>
                </>,
                column_4: <>
                    <div className={`font-mono flex flex-col font-bold text-xs dark:text-white ${Number(Number(evlu_amt) / Number(pchs_amt) * 100 - 100) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                        <div className="pr-1 text-[0.6rem]">
                            {formatNumber(Number(Number(evlu_amt) / Number(pchs_amt) * 100 - 100))}%
                        </div>
                    </div>
                </>,
                column_5: <div className={`font-mono flex flex-col font-bold text-xs ${Number(Number(evlu_amt) / Number(pchs_amt) * 100 - 100) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                    <div>
                        {formatNumber(Number(evlu_pfls_amt2))}{crcy_cd}
                    </div>
                    <div className="text-right text-[0.5rem]">
                        {!!frst_bltn_exrt ? <span>({formatNumber(Number(evlu_pfls_amt2) / Number(frst_bltn_exrt))} USD)</span> : ""}
                    </div>
                </div>,
                column_6: <div className="font-mono text-xs dark:text-white">{formatNumber((Number(pchs_amt) / Number(pchs_amt_smtl_amt) * 100))}%</div>,
                column_7: <div className="font-mono flex flex-col text-xs dark:text-white">
                    <div>
                        {formatNumber(Number(evlu_amt))}{crcy_cd}
                    </div>
                    <div className="text-right text-[0.5rem]">
                        {!!frst_bltn_exrt ? <span>({formatNumber(Number(evlu_amt) / Number(frst_bltn_exrt))} USD)</span> : ""}
                    </div>
                </div>,
                column_8: <div className="font-mono flex flex-col text-xs dark:text-white">
                    <div>
                        {formatNumber(Number(pchs_amt))}{crcy_cd}
                    </div>
                    <div className="text-right text-[0.5rem]">
                        {!!frst_bltn_exrt ? <span>({formatNumber(Number(pchs_amt) / Number(frst_bltn_exrt))} USD)</span> : ""}
                    </div>
                </div>,
                column_9: <div className="font-mono text-xs dark:text-white">{Number(hldg_qty).toFixed(0)}/{Number(ord_psbl_qty).toFixed(0)}</div>,
                column_10: <>
                    <div className="font-mono flex p-0 m-0 gap-1">
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
                            buttonStyle={`font-mono flex items-center justify-center mb-2 px-1 button bg-red-400 rounded-full cursor-pointer select-none
                            active:translate-y-1 active:[box-shadow:0_0px_0_0_#910000,0_0px_0_0_#91000041] active:border-b-[0px]
                            transition-all duration-150 [box-shadow:0_4px_0_0_#910000,0_8px_0_0_#91000041] border-b-[1px]
                            `}
                        />
                    </div>
                </>,
                column_11: <>
                    <div className="font-mono flex flex-col text-xs dark:text-white">
                        <div className="text-[0.6rem]">{Util.UnitConversion(hts_avls, true)}</div>
                    </div>
                </>,
                column_12: <>
                    <div className="font-mono flex flex-col text-xs dark:text-white">
                        <div className="text-[0.6rem]">{Util.UnitConversion(eps, true)}</div>
                    </div>
                </>,
                column_13: <>
                    <div className="font-mono flex flex-col text-xs dark:text-white">
                        <div className="text-[0.6rem]">{per}</div>
                    </div>
                </>,
                column_14: <>
                    <div className="font-mono flex flex-col text-xs dark:text-white">
                        <div className="text-[0.6rem]">{Util.UnitConversion(bps, true)}</div>
                    </div>
                </>,
                column_15: <>
                    <div className="font-mono flex flex-col text-xs dark:text-white">
                        <div className="text-[0.6rem]">{pbr}</div>
                    </div>
                </>,
            }
        }));
    }

    if (DEBUG) console.log(`props.kiOrderCash.msg1`, props.kiOrderCash.msg1); // TODO: 클릭한 종목 바로 밑에 msg 뜨게 변경..!!

    let crcy_cd: string = ""; // 단위
    let nass_amt: number = 0; // 순자산
    let evlu_amt_smtl_amt: number = 0; // 평가금액
    let pchs_amt_smtl_amt: number = 0; // 매입금액
    let evlu_pfls_smtl_amt: number = 0;// 수입
    let frst_bltn_exrt: number = 0; // us 환율
    let dnca_tot_amt: number = 0; // 예수금
    // if (!!props.kiBalance.output2 && props.kiBalance.output2.length > 0) {
    if ("fulfilled" == props.kiBalance.state) {
        // crcy_cd = !!props.kiBalance.output2[0]["crcy_cd"] ? " " + props.kiBalance.output2[0]["crcy_cd"] : "원";
        crcy_cd = "원";

        evlu_amt_smtl_amt = !!props.kiBalance.output3 ? props.kiBalance.output3["evlu_amt_smtl"] : props.kiBalance.output2[0]["evlu_amt_smtl_amt"];
        evlu_amt_smtl_amt = Number(evlu_amt_smtl_amt);
        pchs_amt_smtl_amt = !!props.kiBalance.output3 ? props.kiBalance.output3["pchs_amt_smtl"] : props.kiBalance.output2[0]["pchs_amt_smtl_amt"];
        pchs_amt_smtl_amt = Number(pchs_amt_smtl_amt);

        evlu_pfls_smtl_amt = !!props.kiBalance.output3 ? props.kiBalance.output3["evlu_pfls_amt_smtl"] : props.kiBalance.output2[0]["evlu_pfls_smtl_amt"];
        evlu_pfls_smtl_amt = Number(evlu_pfls_smtl_amt);

        frst_bltn_exrt = !!props.kiBalance.output2[0] ? props.kiBalance.output2[0]["frst_bltn_exrt"] : 0;

        dnca_tot_amt = !!props.kiBalance.output3 ? props.kiBalance.output3["frcr_use_psbl_amt"] : props.kiBalance.output2[0]["dnca_tot_amt"];

        nass_amt = Number(evlu_amt_smtl_amt) + Number(dnca_tot_amt);
    }

    const tablesExample8Props: TablesExample8PropsType = {
        msg: props.kiBalance.msg1,
        title: <>
            <div className="font-mono flex p-2 items-center">
                <DesignButton
                    handleOnClick={() => {
                        // showAlert("지난 주문 확인");
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
                    <Button variant="ghost"><Spinner size="sm" /> loading...</Button>
                    : <>
                        <div className="text-[0.6rem] dark:text-white ml-4">{time.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</div>
                    </>}
            </div>
        </>,
        desc: <>
            <div className="font-mono flex flex-col w-full">
                <div className="flex w-full justify-center">
                    <div className="flex flex-col mx-10 min-w-96 rounded-lg justify-between">
                        <div className="flex flex-col px-12">
                            <div className="text-[0.6rem] text-left">평가손익</div>
                            <div className={`${(Number(evlu_amt_smtl_amt) / Number(pchs_amt_smtl_amt) * 100 - 100) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                                {Number(evlu_pfls_smtl_amt).toLocaleString()}{crcy_cd} ({pchs_amt_smtl_amt == 0 ? "-" : formatNumber(Number(Number(evlu_amt_smtl_amt / pchs_amt_smtl_amt) * 100 - 100))}%)
                            </div>
                            {!!frst_bltn_exrt ? <div className="font-mono text-right text-[0.6rem]">1 $ = {formatNumber(Number(frst_bltn_exrt))} ₩</div> : <></>}
                        </div>
                    </div>
                </div>
            </div>
            <div className="font-mono flex flex-col w-full">
                <div className="flex mb-2 w-full justify-center">
                    <div className="flex flex-col mx-10 min-w-96 rounded-lg justify-between">
                        <div className="flex justify-evenly px-3">
                            <div className="border dark:border-gray-700 rounded-lg px-2 mb-2 min-w-20 md:min-w-32 lg:min-w-32">
                                <div className="text-[0.6rem]">
                                    매입
                                </div>
                                <div className="text-right text-xs md:text-base lg:text-base">
                                    {Number(pchs_amt_smtl_amt).toLocaleString()}{crcy_cd}
                                </div>
                                {!!frst_bltn_exrt ? <div className="text-right text-[0.5rem]"> ({formatNumber(Number(pchs_amt_smtl_amt) / Number(frst_bltn_exrt))} USD)</div> : ""}
                            </div>
                            <div className="border dark:border-gray-700 rounded-lg px-2 mb-2 min-w-20 md:min-w-32 lg:min-w-32">
                                <div className="text-[0.6rem]">
                                    예수금
                                </div>
                                <div className="text-right text-xs md:text-base lg:text-base">
                                    {Number(dnca_tot_amt).toLocaleString()}{crcy_cd}
                                </div>
                                {!!frst_bltn_exrt ? <div className="text-right text-[0.5rem]"> ({formatNumber(Number(dnca_tot_amt) / Number(frst_bltn_exrt))} USD)</div> : ""}
                            </div>
                            <div className="border dark:border-gray-700 rounded-lg px-2 mb-2 min-w-20 md:min-w-32 lg:min-w-32">
                                <div className="text-[0.6rem]">
                                    평가
                                </div>
                                <div className="text-right text-xs md:text-base lg:text-base">
                                    <span className={`${Number(evlu_amt_smtl_amt) > Number(pchs_amt_smtl_amt) ? "text-red-500" : "text-blue-500"}`}>{Number(evlu_amt_smtl_amt).toLocaleString()}{crcy_cd}</span>
                                </div>
                                {!!frst_bltn_exrt ? <div className="text-right text-[0.5rem]"> ({formatNumber(Number(evlu_amt_smtl_amt) / Number(frst_bltn_exrt))} USD)</div> : ""}
                            </div>
                            <div className="border dark:border-gray-700 rounded-lg px-2 mb-2 min-w-20 md:min-w-32 lg:min-w-32">
                                <div className="text-[0.6rem]">
                                    순자산
                                </div>
                                <div className="text-right text-xs md:text-base lg:text-base">
                                    {Number(nass_amt).toLocaleString()}{crcy_cd}
                                </div>
                                {!!frst_bltn_exrt ? <div className="text-right text-[0.5rem]"> ({formatNumber(Number(nass_amt) / Number(frst_bltn_exrt))} USD)</div> : ""}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>,
        tableHead: example8TableHead,
        selectHead: selectHead,
        prevSelectHead: prevSelectHead,
        setSelectHead: setSelectHead,
        setPrevSelectHead: setPrevSelectHead,

        tableRow: example8TableRow,
    }

    return <>
        <div className={`font-mono border border-black text-center w-80 z-10 fixed top-32 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg text-white transition-all duration-500 ${show ? "opacity-100 scale-100 bg-green-500" : "opacity-0 scale-95 pointer-events-none"}`}>
            <div className="">{msg}</div>
            <div className="text-lg">✅ {orderName}</div>
            <div className="">{!!props.kiOrderCash ? props.kiOrderCash.msg1 : ""}</div>
        </div>

        <TablesExample8 {...tablesExample8Props} />
    </>
}