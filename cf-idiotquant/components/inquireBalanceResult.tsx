"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
    Button,
    Card,
    Elevation,
    Section,
    SectionCard,
    HTMLTable,
    Tag,
    Icon,
    Text,
    Spinner,
    HTMLSelect,
    Divider,
    Intent,
    Callout,
    ButtonGroup
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import { useAppDispatch } from "@/lib/hooks";
import { Util } from "./util";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

// --- Helpers ---
const formatNumber = (num: number, isUs: boolean = false) => {
    if (isNaN(num)) return "0";
    return num % 1 === 0 ? num.toLocaleString() : num.toFixed(isUs ? 2 : 0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// 한국/미국 데이터 필드 호환성 맵
const getFieldValue = (item: any, key: string) => {
    const map: any = {
        name: item.prdt_name || item.ovrs_item_name || item.itms_nm,
        price: item.prpr || item.ovrs_now_pric1 || 0,
        avg_price: item.pchs_avg_pric || item.pchs_avg_pric1 || 0,
        qty: item.hldg_qty || item.ccld_qty_smtl1 || 0,
        evlu_amt: item.evlu_amt || item.frcr_evlu_amt2 || 0,
        profit_rt: item.evlu_pfls_rt || item.evlu_pfls_rt1 || 0,
        pchs_amt: item.pchs_amt || item.frcr_pchs_amt || 0,
    };
    return map[key];
};

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
    const { data: session, status } = useSession();

    const dispatch = useAppDispatch();
    const [time] = useState<any>(new Date());

    // 미국 주식 여부 판별 (output3 존재 여부 또는 특정 필드로 판별)
    const isUs = !!props.kiBalance?.output3 || !!props.kiBalance?.output1?.[0]?.ovrs_item_name;
    const currencySign = isUs ? "$" : "₩";
    const exRate = Number(props.kiBalance?.output2?.[0]?.frst_bltn_exrt || 0);

    // 자산 요약 데이터 계산
    const evlu_smtl = Number(props.kiBalance?.output3?.evlu_amt_smtl ?? props.kiBalance?.output2?.[0]?.evlu_amt_smtl_amt ?? 0);
    const pchs_smtl = Number(props.kiBalance?.output3?.pchs_amt_smtl ?? props.kiBalance?.output2?.[0]?.pchs_amt_smtl_amt ?? 0);
    const cash = Number(props.kiBalance?.output3?.frcr_use_psbl_amt ?? props.kiBalance?.output2?.[0]?.dnca_tot_amt ?? 0);
    const totalProfitRate = pchs_smtl === 0 ? 0 : (evlu_smtl / pchs_smtl * 100 - 100);

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // URL에서 'key' 파라미터를 가져옴 (없으면 null)
    const urlKey = searchParams.get("key");

    // 1. URL 파라미터와 Redux/State 동기화
    useEffect(() => {
        if (urlKey) {
            // URL에 키가 있으면 해당 키로 balanceKey 설정
            props.setBalanceKey(urlKey);
        } else if (session?.user?.id) {
            // URL에 키가 없고 내 정보가 로드되면 내 ID를 URL에 주입
            const params = new URLSearchParams(searchParams);
            params.set("key", String(session.user.id));
            router.replace(`${pathname}?${params.toString()}`);
        }
    }, []);

    // 2. 관리자가 다른 계좌를 선택했을 때 실행되는 핸들러
    const handleMasterSelectChange = (newKey: string) => {
        const params = new URLSearchParams(searchParams);
        params.set("key", newKey);

        // URL 업데이트 (상태 유지의 핵심)
        router.push(`${pathname}?${params.toString()}`);
        props.setBalanceKey(newKey);

        // 새로운 키로 데이터 요청
        dispatch(props.reqGetInquireBalance(newKey));
        if (props.reqGetUsCapital) dispatch(props.reqGetUsCapital(newKey));
    };

    return (
        <div className="bp5-dark bg-zinc-50 dark:bg-black p-2 md:p-6 transition-colors">
            <Section
                title={isUs ? "미국 주식 실시간 잔고" : "국내 주식 실시간 잔고"}
                icon={isUs ? IconNames.GLOBE_NETWORK : IconNames.CHART}
                rightElement={
                    <div className="flex items-center gap-3">
                        <Tag minimal>{isUs ? "USD" : "KRW"}</Tag>
                        <Button
                            loading={props.kiBalance.state === "pending"}
                            icon={IconNames.REFRESH}
                            intent={Intent.PRIMARY}
                            onClick={() => dispatch(props.reqGetInquireBalance(props.balanceKey))}
                        >
                            새로고침
                        </Button>
                    </div>
                }
            >
                <SectionCard className="p-0">
                    {/* 마스터 대시보드 */}
                    {/* InquireBalanceResult.tsx 내부 Selector 부분 */}
                    {session?.user?.name === process.env.NEXT_PUBLIC_MASTER && (
                        <div className="p-4 border-b dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50 flex items-center gap-4">
                            <Tag minimal intent={Intent.WARNING} icon={IconNames.KEY}>MASTER MODE</Tag>
                            <HTMLSelect
                                // props로 내려온 balanceKey가 value가 되어야 Selector UI가 유지됨
                                value={props.balanceKey}
                                onChange={(e) => {
                                    const newKey = e.target.value;
                                    props.setBalanceKey(newKey); // 부모의 상태를 변경 -> 부모의 useEffect 실행 -> URL 변경 및 데이터 리프레시
                                }}
                                iconName="caret-down"
                                minimal
                                className="font-bold"
                            >
                                {Array.isArray(props.kakaoMemberList?.list) ? (
                                    props.kakaoMemberList.list.map((item: any) => (
                                        <option key={item.key} value={String(item.key)}>
                                            {item.value?.nickname} ({item.key})
                                        </option>
                                    ))
                                ) : (
                                    <option value="">계좌 목록 로딩 중...</option>
                                )}
                            </HTMLSelect>
                        </div>
                    )}

                    {/* 요약 카드 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x dark:divide-zinc-800 text-center">
                        <SummaryItem
                            label="평가 손익"
                            value={`${totalProfitRate.toFixed(2)}%`}
                            // subValue={`${currencySign}${Math.round(evlu_smtl - pchs_smtl).toLocaleString()}`}
                            subValue={`₩${Math.round(evlu_smtl - pchs_smtl).toLocaleString()}`}
                            intent={totalProfitRate >= 0 ? "text-red-500" : "text-blue-500"}
                        />
                        <SummaryItem
                            label="총 평가금액"
                            // value={`${currencySign}${evlu_smtl.toLocaleString()}`}
                            // subValue={`매입: ${currencySign}${pchs_smtl.toLocaleString()}`}
                            value={`₩${evlu_smtl.toLocaleString()}`}
                            subValue={`매입: ₩${pchs_smtl.toLocaleString()}`}
                        />
                        <SummaryItem
                            label="순자산 (NAV)"
                            // value={`${currencySign}${(evlu_smtl + cash).toLocaleString()}`}
                            // subValue={isUs && exRate ? `약 ₩${Math.round((evlu_smtl + cash) * exRate).toLocaleString()}` : ""}
                            value={`₩${(evlu_smtl + cash).toLocaleString()}`}
                            subValue={isUs && exRate ? `약 ₩${Math.round((evlu_smtl + cash) * exRate).toLocaleString()}` : ""}
                            intent="text-indigo-500"
                        />
                    </div>
                </SectionCard>
            </Section>

            <div className="mt-6 overflow-x-auto rounded-xl">
                <SortableBalanceTable inventoryData={props.kiBalance.output1 || []} isUs={isUs} currencySign={currencySign} />
            </div>

            {props.kiBalance.msg1 && (
                <Callout className="mt-6" intent={Intent.NONE} icon={IconNames.INFO_SIGN}>
                    {props.kiBalance.msg1}
                </Callout>
            )}
        </div>
    );
}

// --- Sub-Components ---

function SummaryItem({ label, value, subValue, intent = "" }: any) {
    return (
        <div className="p-6">
            <Text className="opacity-60 text-xs mb-1 uppercase tracking-wider">{label}</Text>
            <div className={`text-2xl font-black font-mono ${intent}`}>{value}</div>
            <Text className="text-sm block font-normal opacity-70">{subValue}</Text>
        </div>
    );
}

function SortableBalanceTable({ inventoryData, isUs, currencySign }: { inventoryData: any[], isUs: boolean, currencySign: string }) {
    const [sortConfig, setSortConfig] = useState<any>({ key: "evlu_amt", direction: "desc" });

    const sortedItems = useMemo(() => {
        let items = [...inventoryData];
        items.sort((a, b) => {
            const aVal = Number(getFieldValue(a, sortConfig.key));
            const bVal = Number(getFieldValue(b, sortConfig.key));
            return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        });
        return items;
    }, [inventoryData, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === "desc" ? "asc" : "desc" });
    };

    return (
        <HTMLTable interactive striped className="w-full min-w-[800px]">
            <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-900">
                    <th className="text-center w-12 opacity-50">#</th>
                    <th className="cursor-pointer" onClick={() => handleSort("name")}>종목명</th>
                    <th className="text-right cursor-pointer" onClick={() => handleSort("price")}>현재가</th>
                    <th className="text-right cursor-pointer" onClick={() => handleSort("profit_rt")}>수익률</th>
                    <th className="text-right cursor-pointer" onClick={() => handleSort("evlu_amt")}>평가금액</th>
                    <th className="text-center">액션</th>
                </tr>
            </thead>
            <tbody>
                {sortedItems.map((item, idx) => {
                    const profitRt = Number(getFieldValue(item, "profit_rt"));
                    return (
                        <tr key={idx}>
                            <td className="text-center font-mono opacity-50">{idx + 1}</td>
                            <td>
                                <div className="flex flex-col">
                                    <span className="font-bold">{getFieldValue(item, "name")}</span>
                                    <span className="text-[10px] opacity-50">{item.pdno || item.ovrs_pdno}</span>
                                </div>
                            </td>
                            <td className="text-right font-mono">{currencySign}{Number(getFieldValue(item, "price")).toLocaleString()}</td>
                            <td className={`text-right font-mono font-bold ${profitRt >= 0 ? "text-red-500" : "text-blue-500"}`}>
                                {profitRt.toFixed(2)}%
                            </td>
                            <td className="text-right font-mono font-bold">
                                {/* {currencySign}{Number(getFieldValue(item, "evlu_amt")).toLocaleString()} */}
                                ₩{Number(getFieldValue(item, "evlu_amt")).toLocaleString()}
                            </td>
                            <td className="text-center">
                                <ButtonGroup minimal>
                                    <Button icon={IconNames.CHART} small />
                                    <Button icon={IconNames.SEND_MESSAGE} intent={Intent.PRIMARY} small />
                                </ButtonGroup>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </HTMLTable>
    );
}

function SortableHeader({ label, sortKey, align = "left", currentConfig, onSort }: any) {
    const isActive = currentConfig.key === sortKey;
    return (
        <th
            className={`p-3 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors ${align === "right" ? "text-right" : "text-left"}`}
            onClick={() => onSort(sortKey)}
        >
            <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : "justify-start"}`}>
                <Text className={`font-bold ${isActive ? "text-blue-500" : ""}`}>{label}</Text>
                <Icon
                    icon={isActive ? (currentConfig.direction === "asc" ? IconNames.CARET_UP : IconNames.CARET_DOWN) : IconNames.DOUBLE_CARET_VERTICAL}
                    size={12}
                />
            </div>
        </th>
    );
}