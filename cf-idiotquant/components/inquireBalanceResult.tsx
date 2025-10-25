"use client"

import { DesignButton } from "./designButton";
import TablesExample8, { Example8TableHeadType, Example8TableRowType, TablesExample8PropsType } from "./tableExample8";
import { useAppDispatch } from "@/lib/hooks";
import { useEffect, useState } from "react";
import { Util } from "./util";
import Loading from "@/components/loading";
import { Box, Card, Flex, Text } from "@radix-ui/themes";

const DEBUG = false;
function formatNumber(num: number) {
    return num % 1 === 0 ? num.toLocaleString() : num.toFixed(2);
}
interface InquireBalanceResultProps {
    kiBalance: any;
    reqGetInquireBalance: any;
    kiOrderCash?: any;
    reqPostOrderCash?: any;
    stock_list?: any;
}

export default function InquireBalanceResult(props: InquireBalanceResultProps) {
    if (DEBUG) console.log(`[InquireBalanceResult]`, `props`, props);

    const dispatch = useAppDispatch();
    const [show, setShow] = useState<boolean>(false);
    const [msg, setMsg] = useState<any>("");
    const [orderName, setOrderName] = useState<any>("");

    const [time, setTime] = useState<any>(new Date());

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const showAlert = (additionalMsg: string) => {
        setMsg(additionalMsg);
        setShow(true);

        setTimeout(() => {
            setShow(false);
        }, 3000);
    };

    function handleOnClick(item: any, buyOrSell: string) {
        showAlert("주문 비활성화");
        // if ("buy" == buyOrSell || "sell" == buyOrSell) {
        //     const korBuyOrSell = "buy" == buyOrSell ? "구매" : "판매";
        //     const excg_cd = !!item["ovrs_excg_cd"] ? item["ovrs_excg_cd"] : "";
        //     const frst_bltn_exrt = !!props.kiBalance.output2 ? props.kiBalance.output2[0]["frst_bltn_exrt"] : 1;
        //     let price = !!item["prpr"] ? item["prpr"] : item["ovrs_now_pric1"];
        //     price = price / frst_bltn_exrt;

        //     setOrderName(item["prdt_name"] + " " + korBuyOrSell + " 시도" + "(" + formatNumber(Number(price)) + `${(1 != frst_bltn_exrt) ? "USD" : ""}` + ")");
        //     dispatch(props.reqPostOrderCash({ koreaInvestmentToken: props.kiToken, PDNO: item["pdno"], buyOrSell: buyOrSell, excg_cd: excg_cd, price: price }));
        //     showAlert("");
        // }
    }

    const [selectHead, setSelectHead] = useState("비중");
    const [prevSelectHead, setPrevSelectHead] = useState("");

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
                    <Flex direction="column" className="dark:text-white">
                        <Flex direction="row" gap="1">
                            <Text>{index}</Text>
                            <Text>{pdno}</Text>
                        </Flex>
                        <Flex>
                            <Text>{name}</Text>
                        </Flex>
                    </Flex>
                </>,
                column_2: <>
                    <Flex direction="column" className="dark:text-white">
                        <Text>
                            {Number(Number(price).toFixed(0)).toLocaleString()}{crcy_cd}
                        </Text>
                        {!!frst_bltn_exrt ? <Text>{formatNumber(Number(price) / Number(frst_bltn_exrt))} USD</Text>
                            : <></>}
                    </Flex>
                </>,
                column_3: <>
                    <Flex direction="column" className="dark:text-white">
                        <Text>
                            {Number((Number(pchs_amt) / Number(hldg_qty)).toFixed(0)).toLocaleString()}{crcy_cd}
                        </Text>
                        {!!frst_bltn_exrt ? <Text>{formatNumber((Number(pchs_amt) / Number(hldg_qty) / Number(frst_bltn_exrt)))} USD</Text>
                            : <></>}
                    </Flex>
                </>,
                column_4: <>
                    <Flex direction="column" className={`dark:text-white ${Number(Number(evlu_amt) / Number(pchs_amt) * 100 - 100) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                        <Text>
                            {formatNumber(Number(Number(evlu_amt) / Number(pchs_amt) * 100 - 100))}%
                        </Text>
                    </Flex>
                </>,
                column_5: <>
                    <Flex direction="column" className={`${Number(Number(evlu_amt) / Number(pchs_amt) * 100 - 100) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                        <Text>
                            {formatNumber(Number(evlu_pfls_amt2))}{crcy_cd}
                        </Text>
                        <Text>
                            {!!frst_bltn_exrt ? <span>({formatNumber(Number(evlu_pfls_amt2) / Number(frst_bltn_exrt))} USD)</span> : ""}
                        </Text>
                    </Flex>
                </>,
                column_6: <>
                    <Flex direction="column" className="dark:text-white">
                        <Text> {formatNumber((Number(pchs_amt) / Number(pchs_amt_smtl_amt) * 100))}%</Text>
                    </Flex>
                </>,

                column_7: <>
                    <Flex direction="column" className="dark:text-white">
                        <Text>
                            {formatNumber(Number(evlu_amt))}{crcy_cd}
                        </Text>
                        {!!frst_bltn_exrt ? <Text>{formatNumber(Number(evlu_amt) / Number(frst_bltn_exrt))} USD</Text>
                            : <></>}
                    </Flex>
                </>,
                column_8: <>
                    <Flex direction="column" className="dark:text-white">
                        <Text>
                            {formatNumber(Number(pchs_amt))}{crcy_cd}
                        </Text>
                        {!!frst_bltn_exrt ? <Text>({formatNumber(Number(pchs_amt) / Number(frst_bltn_exrt))} USD)</Text>
                            : <></>}
                    </Flex>
                </>,
                column_9: <>
                    <Flex direction="column" className="dark:text-white">
                        <Text>{Number(hldg_qty).toFixed(0)}/{Number(ord_psbl_qty).toFixed(0)}</Text>
                    </Flex>
                </>,
                column_10: <>
                    <Flex direction="row" gap="1">
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
                    </Flex>
                </>,
                column_11: <>
                    <Flex direction="column" className="dark:text-white">
                        <Text>
                            {Util.UnitConversion(hts_avls, true)}
                        </Text>
                    </Flex>
                </>,
                column_12: <>
                    <Flex direction="column" className="dark:text-white">
                        <Text>
                            {Util.UnitConversion(eps, true)}
                        </Text>
                    </Flex>
                </>,
                column_13: <>
                    <Flex direction="column" className="dark:text-white">
                        <Text>
                            {per}
                        </Text>
                    </Flex>
                </>,
                column_14: <>
                    <Flex direction="column" className="dark:text-white">
                        <Text>
                            {Util.UnitConversion(bps, true)}
                        </Text>
                    </Flex>
                </>,
                column_15: <>
                    <Flex direction="column" className="dark:text-white">
                        <Text>
                            {pbr}
                        </Text>
                    </Flex>
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

        const isUsBalance = !!props.kiBalance.output3;
        evlu_amt_smtl_amt = (true == isUsBalance) ? props.kiBalance.output3["evlu_amt_smtl"] : props.kiBalance.output2[0]["evlu_amt_smtl_amt"];
        evlu_amt_smtl_amt = Number(evlu_amt_smtl_amt);
        pchs_amt_smtl_amt = (true == isUsBalance) ? props.kiBalance.output3["pchs_amt_smtl"] : props.kiBalance.output2[0]["pchs_amt_smtl_amt"];
        pchs_amt_smtl_amt = Number(pchs_amt_smtl_amt);

        evlu_pfls_smtl_amt = (true == isUsBalance) ? props.kiBalance.output3["evlu_pfls_amt_smtl"] : props.kiBalance.output2[0]["evlu_pfls_smtl_amt"];
        evlu_pfls_smtl_amt = Number(evlu_pfls_smtl_amt);

        frst_bltn_exrt = !!props.kiBalance.output2[0] ? props.kiBalance.output2[0]["frst_bltn_exrt"] : 0;

        dnca_tot_amt = (true == isUsBalance) ? props.kiBalance.output3["frcr_use_psbl_amt"] : props.kiBalance.output2[0]["dnca_tot_amt"];

        nass_amt = Number(evlu_amt_smtl_amt) + Number(dnca_tot_amt);
    }

    const defaultTitleClassName = "border rounded-xl border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800";
    const defaultTitleSubClassName = "border rounded-xl bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600";

    const tablesExample8Props: TablesExample8PropsType = {
        msg: props.kiBalance.msg1,
        title: <>
            <div className="font-mono flex p-2 items-center">
                <DesignButton
                    handleOnClick={() => {
                        showAlert("지난 주문 확인");
                        setTime(new Date());

                        dispatch(props.reqGetInquireBalance());
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
                    <Loading />
                    : <>
                        <div className="text-[0.6rem] dark:text-white ml-4">{time.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</div>
                    </>}
            </div>
        </>,
        desc: <>
            <Card size="1">
                <Flex direction="column" justify="between" align="center" gap="1" >
                    <Box p="1" className={`${defaultTitleClassName}`}>
                        <Flex direction="column" gap="1" wrap="wrap" justify="center" align="start" minWidth="260px">
                            <Box p="2" minWidth="110px" className={`${defaultTitleSubClassName}`}>
                                <Flex direction="row" gap="1">
                                    <Text size="2">
                                        평가손익
                                    </Text>
                                    <Text size="2" weight="bold" className={`${(Number(evlu_amt_smtl_amt) / Number(pchs_amt_smtl_amt) * 100 - 100) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                                        {Number(evlu_pfls_smtl_amt).toLocaleString()}{crcy_cd}
                                    </Text>
                                    <Text size="2" className={`${(Number(evlu_amt_smtl_amt) / Number(pchs_amt_smtl_amt) * 100 - 100) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                                        ({pchs_amt_smtl_amt == 0 ? "-" : formatNumber(Number(Number(evlu_amt_smtl_amt / pchs_amt_smtl_amt) * 100 - 100))}%)
                                    </Text>
                                </Flex>
                            </Box>
                            <Flex direction="row" gap="1" wrap="wrap" justify="center" align="center">
                                <Box minWidth="8px" className="text-center text-[0.6rem]">=</Box>
                                <Box p="2" minWidth="80px" className={`${defaultTitleSubClassName}`}>
                                    <Flex direction="row" gap="1">
                                        <Text className="text-[0.7rem]">
                                            평가
                                        </Text>
                                        <Text className="text-[0.7rem]">
                                            {Number(evlu_amt_smtl_amt).toLocaleString()}{crcy_cd}
                                        </Text>
                                    </Flex>
                                    {!!frst_bltn_exrt ?
                                        <Flex direction="row-reverse">
                                            <Text color="gray" className="text-[0.5rem]"> ({formatNumber(Number(evlu_amt_smtl_amt) / Number(frst_bltn_exrt))} USD)</Text>
                                        </Flex>
                                        : <></>}
                                </Box>
                                <Box minWidth="8px"><Text className="text-center text-[0.6rem]">-</Text></Box>
                                <Box p="2" minWidth="80px" className={`${defaultTitleSubClassName}`}>
                                    <Flex direction="row" gap="1">
                                        <Text className="text-[0.7rem]">
                                            매입
                                        </Text>
                                        <Text className="text-[0.7rem]">
                                            {Number(pchs_amt_smtl_amt).toLocaleString()}{crcy_cd}
                                        </Text>
                                    </Flex>
                                    <Flex direction="row-reverse">
                                        {!!frst_bltn_exrt ?
                                            <Text color="gray" className="text-[0.5rem]">({formatNumber(Number(pchs_amt_smtl_amt) / Number(frst_bltn_exrt))} USD)</Text>
                                            : <></>}
                                    </Flex>
                                </Box>
                            </Flex>
                        </Flex>
                    </Box>
                    <Box p="1" className={`${defaultTitleClassName}`}>
                        <Flex direction="column" gap="1" wrap="wrap" justify="center" align="start" minWidth="260px">
                            <Box p="2" minWidth="110px" className={`${defaultTitleSubClassName}`}>
                                <Flex direction="row" gap="1">
                                    <Text size="2">
                                        순자산
                                    </Text>
                                    <Text size="2" weight="bold">
                                        {Number(nass_amt).toLocaleString()}{crcy_cd}
                                    </Text>
                                    {!!frst_bltn_exrt ?
                                        <Text size="2" color="gray">({formatNumber(Number(nass_amt) / Number(frst_bltn_exrt))} USD)</Text>
                                        : <></>}
                                </Flex>
                            </Box>
                            <Flex direction="row" gap="1" wrap="wrap" justify="center" align="center">
                                <Box minWidth="8px" className="text-center text-[0.6rem]">=</Box>
                                <Box p="2" minWidth="80px" className={`${defaultTitleSubClassName}`}>
                                    <Flex direction="row">
                                        <Text className="text-[0.7rem]">
                                            평가
                                        </Text>
                                        <Text className="text-[0.7rem]">
                                            {Number(evlu_amt_smtl_amt).toLocaleString()}{crcy_cd}
                                        </Text>
                                    </Flex>
                                    {!!frst_bltn_exrt ?
                                        <Flex direction="row-reverse">
                                            <Text color="gray" className="text-[0.5rem]">({formatNumber(Number(evlu_amt_smtl_amt) / Number(frst_bltn_exrt))} USD)</Text>
                                        </Flex>
                                        : <></>}
                                </Box>
                                <Box minWidth="8px" className="text-center text-[0.6rem]">+</Box>
                                <Box p="2" minWidth="80px" className={`${defaultTitleSubClassName}`}>
                                    <Flex direction="row" gap="1">
                                        <Text className="text-[0.7rem]">
                                            예수금
                                        </Text>
                                        <Text className="text-[0.7rem]">
                                            {Number(dnca_tot_amt).toLocaleString()}{crcy_cd}
                                        </Text>
                                    </Flex>
                                    <Flex direction="row-reverse" gap="1">
                                        {!!frst_bltn_exrt ?
                                            <Text color="gray" className="text-[0.5rem]">({formatNumber(Number(dnca_tot_amt) / Number(frst_bltn_exrt))} USD)</Text>
                                            : <></>}
                                    </Flex>
                                </Box>
                            </Flex>
                        </Flex>
                    </Box>
                    {!!frst_bltn_exrt ?
                        <Flex direction="row-reverse" align="end">
                            <Text size="1" color="gray" >(1 $ = {formatNumber(Number(frst_bltn_exrt))} ₩)</Text>
                        </Flex>
                        : <></>}
                </Flex>
            </Card >
        </>,
        tableHead: example8TableHead,
        selectHead: selectHead,
        prevSelectHead: prevSelectHead,
        setSelectHead: setSelectHead,
        setPrevSelectHead: setPrevSelectHead,

        tableRow: example8TableRow,
    }

    return <>
        <div className={`font-mono border border-black text-center w-min-40 z-10 fixed top-32 left-1/2 transform -translate-x-1/2 px-5 py-2 rounded-xl text-white transition-all duration-100 ease-out bg-green-500 ${show ? "opacity-100 scale-100" : "opacity-0 scale-100 pointer-events-none"}`}>
            <div className="flex gap-2 items-center">
                <div className="">{msg}</div>
                <div className="text-lg">✅ {orderName}</div>
            </div>
            <div className="">{!!props.kiOrderCash ? props.kiOrderCash.msg1 : ""}</div>
        </div>

        <TablesExample8 {...tablesExample8Props} />
    </>
}