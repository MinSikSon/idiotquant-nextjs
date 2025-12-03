"use client"

import { DesignButton } from "./designButton";
import TableTemplate, { Example8TableHeadType, Example8TableRowType, TablesExample8PropsType } from "./tableExample8";
import { useAppDispatch } from "@/lib/hooks";
import { useEffect, useState } from "react";
import { Util } from "./util";
import { Box, Button, Card, Flex, Select, Spinner, Text } from "@radix-ui/themes";

const DEBUG = false;

function formatNumber(num: number) {
    return num % 1 === 0 ? num.toLocaleString() : num.toFixed(2);
}
interface InquireBalanceResultProps {
    balanceKey: any;
    setBalanceKey: any;
    kiBalance: any;
    reqGetInquireBalance: any;
    reqGetInquireCcnl?: any;
    reqGetInquireNccs?: any;
    reqGetUsCapital?: any;
    kiOrderCash?: any;
    reqPostOrderCash?: any;
    stock_list?: any;
    kakaoTotal?: any;
    kakaoMemberList?: any;
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

        if (DEBUG) console.log(`[InquireBalanceResult] props.kakaoTotal:`, props.kakaoTotal);
        if (DEBUG) console.log(`[InquireBalanceResult] props.kakaoTotal?.kakao_account?.profile?.nickname:`, props.kakaoTotal?.kakao_account?.profile?.nickname);
        if (DEBUG) console.log(`[InquireBalanceResult] props.kakaoMemberList:`, props.kakaoMemberList);
    }, []);
    useEffect(() => {
        if (DEBUG) console.log(`[InquireBalanceResult] props.balanceKey:`, props.balanceKey)
    }, [props.balanceKey]);


    function handleOnClick(item: any, buyOrSell: string) {
        setMsg("주문 비활성화");
        // if ("buy" == buyOrSell || "sell" == buyOrSell) {
        //     const korBuyOrSell = "buy" == buyOrSell ? "구매" : "판매";
        //     const excg_cd = !!item["ovrs_excg_cd"] ? item["ovrs_excg_cd"] : "";
        //     const frst_bltn_exrt = !!props.kiBalance.output2 ? props.kiBalance.output2[0]["frst_bltn_exrt"] : 1;
        //     let price = !!item["prpr"] ? item["prpr"] : item["ovrs_now_pric1"];
        //     price = price / frst_bltn_exrt;

        //     setOrderName(item["prdt_name"] + " " + korBuyOrSell + " 시도" + "(" + formatNumber(Number(price)) + `${(1 != frst_bltn_exrt) ? "USD" : ""}` + ")");
        //     dispatch(props.reqPostOrderCash({ koreaInvestmentToken: props.kiToken, PDNO: item["pdno"], buyOrSell: buyOrSell, excg_cd: excg_cd, price: price }));
        // }
    }

    const [selectHead, setSelectHead] = useState("비중");
    const [prevSelectHead, setPrevSelectHead] = useState("");

    const example8TableHead: Example8TableHeadType[] = [
        {
            head: "#",
        },
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
            head: "보유/" + "\n\n" + "주문가능",
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
                const aEval = Number(a.evlu_amt ?? a.frcr_evlu_amt2) || 0; // 평가금액 없으면 0
                const aPurchase = Number(a.pchs_amt ?? a.frcr_pchs_amt) || 1; // 매입금액 없으면 1로 나눠서 NaN 방지
                cond_a = aEval / aPurchase;

                // b 수익률 계산
                const bEval = Number(b.evlu_amt ?? b.frcr_evlu_amt2) || 0;
                const bPurchase = Number(b.pchs_amt ?? b.frcr_pchs_amt) || 1;
                cond_b = bEval / bPurchase;
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
            const crcy_cd = <span className="text-[0.6rem]">{"₩"}</span>;
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
                    <Flex direction="column" align="center" justify="center">
                        <Text align="center">{index}</Text>
                    </Flex>
                </>,
                column_2: <>
                    <Flex direction="column">
                        <Text>{name}</Text>
                        <Text>{pdno}</Text>
                    </Flex>
                </>,
                column_3: <>
                    <Flex direction="column">
                        <Text>
                            {crcy_cd}{Number(Number(price).toFixed(0)).toLocaleString()}
                        </Text>
                        {!!frst_bltn_exrt ? <Text>${formatNumber(Number(price) / Number(frst_bltn_exrt))}</Text>
                            : <></>}
                    </Flex>
                </>,
                column_4: <>
                    <Flex direction="column">
                        <Text>
                            {crcy_cd}{Number((Number(pchs_amt) / Number(hldg_qty)).toFixed(0)).toLocaleString()}
                        </Text>
                        {!!frst_bltn_exrt ? <Text>${formatNumber((Number(pchs_amt) / Number(hldg_qty) / Number(frst_bltn_exrt)))}</Text>
                            : <></>}
                    </Flex>
                </>,
                column_5: <>
                    <Flex direction="column" className={`dark:text-white ${Number(Number(evlu_amt) / Number(pchs_amt) * 100 - 100) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                        <Text>
                            {formatNumber(Number(Number(evlu_amt) / (Number(pchs_amt) || 1) * 100 - 100))}%
                        </Text>
                    </Flex>
                </>,
                column_6: <>
                    <Flex direction="column" className={`${Number(Number(evlu_amt) / Number(pchs_amt) * 100 - 100) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                        <Text>
                            {crcy_cd}{formatNumber(Number(evlu_pfls_amt2))}
                        </Text>
                        <Text>
                            {!!frst_bltn_exrt ? <span>${formatNumber(Number(evlu_pfls_amt2) / Number(frst_bltn_exrt))}</span> : ""}
                        </Text>
                    </Flex>
                </>,
                column_7: <>
                    <Flex direction="column">
                        <Text> {formatNumber((Number(pchs_amt) / Number(pchs_amt_smtl_amt) * 100))}%</Text>
                    </Flex>
                </>,

                column_8: <>
                    <Flex direction="column">
                        <Text>
                            {crcy_cd}{formatNumber(Number(evlu_amt))}
                        </Text>
                        {!!frst_bltn_exrt ? <Text>${formatNumber(Number(evlu_amt) / Number(frst_bltn_exrt))}</Text>
                            : <></>}
                    </Flex>
                </>,
                column_9: <>
                    <Flex direction="column">
                        <Text>
                            {crcy_cd}{formatNumber(Number(pchs_amt))}
                        </Text>
                        {!!frst_bltn_exrt ? <Text>${formatNumber(Number(pchs_amt) / Number(frst_bltn_exrt))}</Text>
                            : <></>}
                    </Flex>
                </>,
                column_10: <>
                    <Flex direction="column">
                        <Text>{Number(hldg_qty).toFixed(0)}/{Number(ord_psbl_qty).toFixed(0)}</Text>
                    </Flex>
                </>,
                column_11: <>
                    <Flex direction="row" gap="1">
                        <Button disabled size="1" color="blue" onClick={() => handleOnClick(item, "buy")}>buy</Button>
                        <Button disabled size="1" color="ruby" onClick={() => handleOnClick(item, "sell")}>sell</Button>
                    </Flex>
                </>,
                column_12: <>
                    <Flex direction="column">
                        <Text>
                            {Util.UnitConversion(hts_avls, true)}
                        </Text>
                    </Flex>
                </>,
                column_13: <>
                    <Flex direction="column">
                        <Text>
                            {Util.UnitConversion(eps, true)}
                        </Text>
                    </Flex>
                </>,
                column_14: <>
                    <Flex direction="column">
                        <Text>
                            {per}
                        </Text>
                    </Flex>
                </>,
                column_15: <>
                    <Flex direction="column">
                        <Text>
                            {Util.UnitConversion(bps, true)}
                        </Text>
                    </Flex>
                </>,
                column_16: <>
                    <Flex direction="column">
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
    let ustl_sll_amt_smtl: number = 0; // 미결제매도금액합계
    // if (!!props.kiBalance.output2 && props.kiBalance.output2.length > 0) {
    if ("fulfilled" == props.kiBalance.state) {
        // crcy_cd = !!props.kiBalance.output2[0]["crcy_cd"] ? " " + props.kiBalance.output2[0]["crcy_cd"] : "원";
        crcy_cd = "₩";

        const isUsBalance = !!props.kiBalance.output3;
        evlu_amt_smtl_amt = Number(props.kiBalance?.output3?.["evlu_amt_smtl"] ?? props.kiBalance?.output2?.[0]?.["evlu_amt_smtl_amt"] ?? 0);
        pchs_amt_smtl_amt = Number(props.kiBalance?.output3?.["pchs_amt_smtl"] ?? props.kiBalance?.output2?.[0]?.["pchs_amt_smtl_amt"] ?? 0);
        evlu_pfls_smtl_amt = Number(props.kiBalance?.output3?.["evlu_pfls_amt_smtl"] ?? props.kiBalance?.output2?.[0]?.["evlu_pfls_smtl_amt"] ?? 0);

        frst_bltn_exrt = Number(props.kiBalance?.output2?.[0]?.["frst_bltn_exrt"] ?? 0); // $1 = ₩?
        dnca_tot_amt = Number(props.kiBalance?.output3?.["frcr_use_psbl_amt"] ?? props.kiBalance?.output2?.[0]?.["dnca_tot_amt"] ?? 0);

        ustl_sll_amt_smtl = Number(props.kiBalance?.output3?.ustl_sll_amt_smtl ?? 0);

        nass_amt = evlu_amt_smtl_amt + dnca_tot_amt + ustl_sll_amt_smtl;
    }

    const tablesExample8Props: TablesExample8PropsType = {
        msg: props.kiBalance.msg1,
        title: <>
            <Flex direction="column">
                <Box>
                    <Flex p="2" className="!font-mono !items-center">
                        <Button
                            onClick={() => {
                                if (DEBUG) console.log("clicked");
                                setMsg("지난 주문 확인");
                                setTime(new Date());
                                dispatch(props.reqGetInquireBalance(props.balanceKey));
                                if (!!props.reqGetInquireCcnl) {
                                    dispatch(props.reqGetInquireCcnl(props.balanceKey));
                                }
                                if (!!props.reqGetInquireNccs) {
                                    dispatch(props.reqGetInquireNccs(props.balanceKey));
                                }
                                if (!!props.reqGetUsCapital) {
                                    dispatch(props.reqGetUsCapital(props.balanceKey));
                                }
                            }}
                            variant="outline"
                            radius="full"
                        >
                            <Text size="3">
                                알고리즘 매매 계좌 조회
                            </Text>
                        </Button>
                        {"pending" == props.kiBalance.state ?
                            <>
                                <Box pl="1">
                                    <Flex direction={"row"} gap="1" align="center">
                                        <Spinner loading />{msg}
                                    </Flex>
                                </Box>
                            </>
                            : <>
                                <Text ml="4">
                                    {time.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                                </Text>
                            </>}
                    </Flex>
                </Box>
                {(props.kakaoTotal?.kakao_account?.profile?.nickname === process.env.NEXT_PUBLIC_MASTER) && <Box>
                    <Flex p="2" className="!font-mono !items-center">
                        <Box mt="2" width="100%">
                            <Card>
                                <Flex direction="column">
                                    <Box>
                                        <Text align={"center"}>master dashboard</Text>
                                    </Box>
                                    <Box p="1">
                                        {/* <Link href="/report" ><Button>ReportPage</Button></Link> */}
                                        <Flex align="center" gap="1">
                                            <Text size="3">계좌 선택</Text>
                                            <Select.Root
                                                size="3"
                                                defaultValue={props.balanceKey}
                                                onValueChange={(value) => props.setBalanceKey(value)} // ✅ 선택 시 이벤트
                                            >
                                                <Select.Trigger />
                                                <Select.Content>
                                                    <Select.Group>
                                                        <Select.Label>사용자명</Select.Label>
                                                        {!!props.kakaoMemberList && "fulfilled" == props.kakaoMemberList.state && props.kakaoMemberList?.list?.map((item: any) => {
                                                            return <Select.Item value={item.key} key={item.key}>{item.key} - {item.value.nickname}</Select.Item>
                                                        })}
                                                    </Select.Group>
                                                    {/* <Select.Separator />
                                                    <Select.Group>
                                                        <Select.Label>Vegetables</Select.Label>
                                                        <Select.Item value="carrot">Carrot</Select.Item>
                                                        <Select.Item value="potato">Potato</Select.Item>
                                                    </Select.Group> */}
                                                </Select.Content>
                                            </Select.Root>
                                        </Flex>
                                    </Box>
                                </Flex>
                            </Card>
                        </Box>
                    </Flex>
                </Box>}
            </Flex>
        </>,
        desc: <>
            <Flex direction="column" justify="between" align="center" gap="1" >
                <Box p="1">
                    <Flex direction="row" gap="1" wrap="wrap" justify="center" align="center" minWidth="260px">
                        <Box p="0" m="0" className={`${(Number(evlu_amt_smtl_amt) / Number(pchs_amt_smtl_amt) * 100 - 100) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                            <Flex direction="column" align="end" gap="0">
                                <Text size="1">
                                    평가손익 {pchs_amt_smtl_amt == 0 ? "-" : formatNumber(Number(Number(evlu_amt_smtl_amt / pchs_amt_smtl_amt) * 100 - 100))}%
                                </Text>
                                <Text size="4" weight="bold">
                                    {crcy_cd}{Number(evlu_pfls_smtl_amt).toLocaleString()}
                                </Text>
                            </Flex>
                        </Box>
                        <Box minWidth="8px" className="text-center text-[0.6rem]">=</Box>
                        <Box p="0" m="0">
                            <Flex direction="column" align="end" gap="0">
                                <Text size="1" color="gray">평가 {!!frst_bltn_exrt ? `$${formatNumber(Number(evlu_amt_smtl_amt) / Number(frst_bltn_exrt))}` : ""}</Text>
                                <Text size="2">{crcy_cd}{Number(evlu_amt_smtl_amt).toLocaleString()}</Text>
                            </Flex>
                        </Box>
                        <Box minWidth="8px"><Text className="text-center text-[0.6rem]">-</Text></Box>
                        <Box p="0" m="0">
                            <Flex direction="column" align="end" gap="0">
                                <Text size="1" color="gray">매입 {!!frst_bltn_exrt ? `$${formatNumber(Number(pchs_amt_smtl_amt) / Number(frst_bltn_exrt))}` : ""}</Text>
                                <Text size="2">{crcy_cd}{Number(pchs_amt_smtl_amt).toLocaleString()}</Text>
                            </Flex>
                        </Box>
                    </Flex>
                </Box>
                <Box p="1">
                    <Flex direction="row" gap="1" wrap="wrap" justify="center" align="center" minWidth="260px">
                        <Box>
                            <Flex direction="column" align="end" gap="0">
                                <Text size="1" color="gray">순자산 {!!frst_bltn_exrt ? `$${formatNumber(Number(nass_amt) / Number(frst_bltn_exrt))}` : ""}</Text>
                                <Text size="3" weight="bold">
                                    {crcy_cd}{Number(nass_amt).toLocaleString()}
                                </Text>
                            </Flex>
                        </Box>
                        <Flex direction="row" gap="0" wrap="wrap" justify="center" align="center">
                            <Box minWidth="8px" className="text-center text-[0.6rem]">=</Box>
                            <Box p="0" m="0">
                                <Flex direction="column" align="end" gap="0">
                                    <Text size="1" color="gray">평가</Text>
                                    <Text size="1" color="gray">{!!frst_bltn_exrt ? `$${formatNumber(Number(evlu_amt_smtl_amt) / Number(frst_bltn_exrt))}` : ""}</Text>
                                    <Text size="1" className="">
                                        {crcy_cd}{Number(evlu_amt_smtl_amt).toLocaleString()}
                                    </Text>
                                </Flex>
                            </Box>
                            <Box minWidth="8px" className="text-center text-[0.6rem]">+</Box>
                            <Box p="0" m="0">
                                <Flex direction="column" align="end" gap="0">
                                    <Text size="1" color="gray" >예수금</Text>
                                    <Text size="1" color="gray" >{!!frst_bltn_exrt ? `$${formatNumber(Number(dnca_tot_amt) / Number(frst_bltn_exrt))}` : ""}</Text>
                                    <Text size="1">
                                        {crcy_cd}{Number(dnca_tot_amt).toLocaleString()}
                                    </Text>
                                </Flex>
                            </Box>
                            <Box minWidth="8px" className="text-center text-[0.6rem]">+</Box>
                            <Box p="0" m="0">
                                <Flex direction="column" align="end" gap="0">
                                    <Text size="1" color="gray">미결제매도금</Text>
                                    <Text size="1" color="gray">{!!frst_bltn_exrt ? `$${formatNumber(Number(ustl_sll_amt_smtl) / Number(frst_bltn_exrt))}` : ""}</Text>
                                    <Text size="1">
                                        {crcy_cd}{Number(ustl_sll_amt_smtl).toLocaleString()}
                                    </Text>
                                </Flex>
                            </Box>

                        </Flex>
                    </Flex>
                </Box>
            </Flex>
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

        <TableTemplate {...tablesExample8Props} />
    </>
}