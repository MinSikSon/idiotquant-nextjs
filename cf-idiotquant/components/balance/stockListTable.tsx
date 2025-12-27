"use client";

import React, { useEffect, useState } from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { UsCapitalStockItem, KrUsCapitalType } from "@/lib/features/capital/capitalSlice";
import { Button, Flex, Grid, Text } from "@radix-ui/themes";
import { CapitalTokenTypeValueStock } from "@/lib/features/algorithmTrade/algorithmTradeSlice";

interface Props {
  data?: KrUsCapitalType;
  kakaoTotal: any;
  doTokenPlusAll: any;
  doTokenPlusOne: any;
  doTokenMinusAll: any;
  doTokenMinusOne: any;
  className?: string;
}

const HEADERS: { key: "index" | keyof UsCapitalStockItem | keyof CapitalTokenTypeValueStock | "actions"; label: string }[] = [
  { key: "index", label: "#" },
  { key: "symbol", label: "심볼" },
  { key: "PDNO", label: "심볼2" },
  { key: "name", label: "회사명" },
  { key: "token", label: "Token" },
  { key: "key", label: "Key" },
  { key: "output_balanceSheet", label: "bs" },
  { key: "output_inquirePrice", label: "price" },
  { key: "ncavRatio", label: "NCAV 비율" },
  { key: "action", label: "Action" },
  { key: "condition", label: "Condition" },
  { key: "actions", label: "동작: 개별종목 TOKEN refill" },

  // "symbol" | "key" | "condition" | "ncavRatio" | "name" | "index" | "token" | "action" | "PDNO" | "output_inquirePrice" | "output_balanceSheet" | "actions"
];

export default function StockListTable({ data, kakaoTotal, doTokenPlusAll, doTokenPlusOne, doTokenMinusAll, doTokenMinusOne, className = "" }: Props) {
  const rows = data?.stock_list ?? [];

  // 선택된 항목과 모달 열림 상태
  const [selected, setSelected] = useState<UsCapitalStockItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const [master, setMaster] = useState(kakaoTotal?.kakao_account?.profile?.nickname === process.env.NEXT_PUBLIC_MASTER);

  // Esc로 닫기
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // 상세 버튼 클릭 핸들러
  const openDetail = (item: UsCapitalStockItem) => {
    setSelected(item);
    setIsOpen(true);
  };

  const closeDetail = () => {
    setIsOpen(false);
    // 선택값은 닫을 때 유지하거나 null로 리셋하고 싶으면 아래 주석 해제
    // setSelected(null);
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <Flex direction="column" justify="center" gap="1">
          <Text>
            상태: {data?.state}
          </Text>
          <Flex direction="column" justify="center" gap="1" className="border-2 rounded-xl px-1 py-2">
            <Text>
              action: {data?.action}
            </Text>
            <Text>time_stamp:</Text>
            <Text size="1" className="pl-2">{data?.time_stamp?.prevPrev ?? ""}</Text>
            <Text size="1" className="pl-2">{data?.time_stamp?.prev ?? ""}</Text>
            <Text size="1" className="pl-2">{data?.time_stamp?.current ?? ""}</Text>
          </Flex>
        </Flex>
        <Flex direction="column">
          <Flex direction="column">
            <Text>Token per Stock: {data?.token_info?.token_per_stock ?? 0}</Text>
            <Text className="pl-2">• Refill Index: {data?.token_info?.refill_stock_index ?? 0}</Text>
          </Flex>
          {(kakaoTotal?.kakao_account?.profile?.nickname === process.env.NEXT_PUBLIC_MASTER) ?
            <Flex direction="column" align="center" justify="center" p="1" my="1" className="border-2 rounded-xl">
              <Text>all TOKEN (active only)</Text>
              <Grid columns="1" gap="1" align="center" justify="center">
                <Flex gap="1" align="center" justify="end">
                  <Text>₩5,000</Text>
                  <Button disabled={false == master} onClick={() => doTokenPlusAll(5_000)} size="2">+</Button>
                  <Button disabled={false == master} onClick={() => doTokenMinusAll(5_000)} size="2" color="tomato" >-</Button>
                </Flex>
                <Flex gap="1" align="center" justify="end">
                  <Text>₩10,000</Text>
                  <Button disabled={false == master} onClick={() => doTokenPlusAll(10_000)} size="2">+</Button>
                  <Button disabled={false == master} onClick={() => doTokenMinusAll(10_000)} size="2" color="tomato" >-</Button>
                </Flex>
                <Flex gap="1" align="center" justify="end">
                  <Text>₩50,000</Text>
                  <Button disabled={false == master} onClick={() => doTokenPlusAll(50_000)} size="2">+</Button>
                  <Button disabled={false == master} onClick={() => doTokenMinusAll(50_000)} size="2" color="tomato" >-</Button>
                </Flex>
                <Flex gap="1" align="center" justify="end">
                  <Text>₩100,000</Text>
                  <Button disabled={false == master} onClick={() => doTokenPlusAll(100_000)} size="2" >+</Button>
                  <Button disabled={false == master} onClick={() => doTokenMinusAll(100_000)} size="2" color="tomato" >-</Button>
                </Flex>
                <Flex gap="1" align="center" justify="end">
                  <Text>₩200,000</Text>
                  <Button disabled={false == master} onClick={() => doTokenPlusAll(200_000)} size="2" >+</Button>
                  <Button disabled={false == master} onClick={() => doTokenMinusAll(200_000)} size="2" color="tomato" >-</Button>
                </Flex>
                <Flex gap="1" align="center" justify="end">
                  <Text>₩500,000</Text>
                  <Button disabled={false == master} onClick={() => doTokenPlusAll(500_000)} size="2" >+</Button>
                  <Button disabled={false == master} onClick={() => doTokenMinusAll(500_000)} size="2" color="tomato" >-</Button>
                </Flex>
                <Flex gap="1" align="center" justify="end">
                  <Text>₩1,000,000</Text>
                  <Button disabled={false == master} onClick={() => doTokenPlusAll(1_000_000)} size="2" >+</Button>
                  <Button disabled={false == master} onClick={() => doTokenMinusAll(1_000_000)} size="2" color="tomato"  >-</Button>
                </Flex>
              </Grid>
            </Flex>
            : <></>}
        </Flex>
      </div>

      <ScrollArea.Root className="rounded-md border border-slate-200">
        <ScrollArea.Viewport className="w-full h-[420px]">
          <div className="min-w-[800px]">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr>
                  {HEADERS.map((h, idx) => (
                    <th
                      key={String(h.key)}
                      className="px-3 py-1.5 text-left text-xs font-medium uppercase tracking-wider bg-white dark:bg-black border-b sticky top-0 z-20"
                      style={idx >= 1 && idx <= 4 ? { position: "sticky", left: (idx - 1) * 20, zIndex: 30 } : {}}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={HEADERS.length} className="p-6 text-center text-sm">
                      결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  rows.map((row: any, rIndex) => {
                    let cras = 0;
                    let total_lblt = 0;
                    let hts_avls = 0;
                    return (
                      <tr key={`${row.key}-${rIndex}`} className={rIndex % 2 === 0 ? "bg-white dark:bg-black" : "bg-slate-50 dark:bg-slate-800"}>
                        {HEADERS.map((h, cIndex) => {
                          if (h.key === "actions") {
                            return (
                              <td key={`cell-${rIndex}-${cIndex}`} className="px-3 py-1.5 whitespace-nowrap border-b">
                                <div className="flex gap-2">
                                  <>
                                    <Flex gap="1" align="center" justify="end">
                                      <Text>|</Text>
                                      <Text size="2">₩10,000</Text>
                                      <Button size="2" disabled={false == master} onClick={() => doTokenPlusOne(10_000, row?.symbol ?? row?.PDNO ?? "")}>+</Button>
                                      <Button size="2" disabled={false == master} onClick={() => doTokenMinusOne(10_000, row?.symbol ?? row?.PDNO ?? "")} color="tomato" >-</Button>
                                    </Flex>
                                    <Flex gap="1" align="center" justify="end">
                                      <Text>|</Text>
                                      <Text size="2">₩100,000</Text>
                                      <Button size="2" disabled={false == master} onClick={() => doTokenPlusOne(100_000, row?.symbol ?? row?.PDNO ?? "")} >+</Button>
                                      <Button size="2" disabled={false == master} onClick={() => doTokenMinusOne(100_000, row?.symbol ?? row?.PDNO ?? "")} color="tomato" >-</Button>
                                    </Flex>
                                    <Flex gap="1" align="center" justify="end">
                                      <Text>|</Text>
                                      <Text size="2">₩1,000,000</Text>
                                      <Button size="2" disabled={false == master} onClick={() => doTokenPlusOne(1_000_000, row?.symbol ?? row?.PDNO ?? "")} >+</Button>
                                      <Button size="2" disabled={false == master} onClick={() => doTokenMinusOne(1_000_000, row?.symbol ?? row?.PDNO ?? "")} color="tomato"  >-</Button>
                                    </Flex>
                                  </>
                                </div>
                              </td>
                            );
                          }

                          if (h.key === "condition") {
                            return (
                              <td key={`cell-${rIndex}-${cIndex}`} className="px-3 py-1.5 whitespace-nowrap border-b">
                                <div className="flex gap-2">
                                  {/* 상세 버튼에 openDetail 연결 */}
                                  <Button size="1" onClick={() => openDetail(row)} aria-haspopup="dialog">상세</Button>
                                </div>
                              </td>
                            );
                          }

                          if (h.key === "index") {
                            return (
                              <td key={`cell-${rIndex}-${cIndex}`}
                                className={`px-3 py-1.5 border-b ${rIndex % 2 === 0 ? "bg-white dark:bg-black" : "bg-slate-50 dark:bg-slate-800"}`}
                                style={cIndex >= 1 && cIndex <= 4 ? { position: "sticky", left: (cIndex - 1) * 20, zIndex: 10 } : {}}
                              >
                                {rIndex}
                              </td>
                            );
                          }


                          const key = h.key as (keyof UsCapitalStockItem | keyof CapitalTokenTypeValueStock);
                          const value = row[key] ?? "-";

                          if (h.key === "output_balanceSheet") {
                            const latestBs = value?.output?.[0] ?? {};
                            const stac_yymm = latestBs?.stac_yymm ?? "";
                            cras = Number(latestBs?.cras ?? 0); // 유동자산
                            total_lblt = Number(latestBs?.total_lblt ?? 0); // 부채총계
                            return (
                              <td key={`cell-${rIndex}-${cIndex}`} className="px-3 py-1.5 whitespace-nowrap border-b">
                                <div className="flex gap-2">
                                  {/* 상세 버튼에 openDetail 연결 */}
                                  <Flex direction="column">
                                    <Text className="text-[0.6rem]">({stac_yymm})</Text>
                                    <Text size="1">유동자산: ₩{cras.toLocaleString()}억</Text>
                                    <Text size="1">부채총계: ₩{total_lblt.toLocaleString()}억</Text>
                                  </Flex>
                                </div>
                              </td>
                            );
                          }

                          if (h.key === "output_inquirePrice") {
                            const inquirePrice = value?.output ?? {};

                            const stck_prpr = Number(inquirePrice?.stck_prpr ?? 0); // 현재가
                            hts_avls = Number(inquirePrice?.hts_avls ?? 0); // 시가총액
                            const lstn_stcn = Number(inquirePrice?.lstn_stcn ?? 0); // 상장주수
                            return (
                              <td key={`cell-${rIndex}-${cIndex}`} className="px-3 py-1.5 whitespace-nowrap border-b">
                                <div className="flex gap-2">
                                  {/* 상세 버튼에 openDetail 연결 */}
                                  <Flex direction="column">
                                    <Text size="1">현재가: ₩{stck_prpr.toLocaleString()}</Text>
                                    <Text size="1">시가총액: ₩{hts_avls.toLocaleString()}억</Text>
                                    <Text size="1">상장주수: {Number(lstn_stcn).toLocaleString()}개</Text>
                                  </Flex>
                                </div>
                              </td>
                            );
                          }

                          if ("-" === value && "ncavRatio" === key) {
                            return (
                              <td key={`cell-${rIndex}-${cIndex}`} className="px-3 py-1.5 whitespace-nowrap border-b">
                                <div className="flex gap-2">
                                  {/* 상세 버튼에 openDetail 연결 */}
                                  <Text>{Number(0 == hts_avls ? 0 : (cras - total_lblt) / hts_avls).toFixed(2)}</Text>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td
                              key={`cell-${rIndex}-${cIndex}`}
                              className={`px-3 py-1.5 border-b ${rIndex % 2 === 0 ? "bg-white dark:bg-black" : "bg-slate-50 dark:bg-slate-800"}`}
                              style={cIndex >= 1 && cIndex <= 4 ? { position: "sticky", left: (cIndex - 1) * 20, zIndex: 10 } : {}}
                            >
                              <div className="text-sm">{String(value)}</div>
                            </td>
                          );
                        })}
                      </tr>);
                  })
                )}
              </tbody>
            </table>
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="horizontal" className="flex select-none touch-none p-0.5 bg-slate-100" />
        <ScrollArea.Scrollbar orientation="vertical" className="flex select-none touch-none p-0.5 bg-slate-100" />
        <ScrollArea.Corner />
      </ScrollArea.Root>

      {/* -----------------------------
          상세 모달 (간단한 Overlay)
         ----------------------------- */}
      {
        isOpen && selected && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            {/* dim */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={closeDetail}
              aria-hidden="true"
            />

            {/* content */}
            <div className="relative z-10 w-[min(90%,800px)] max-h-[80vh] overflow-auto rounded-lg p-4 shadow-lg. bg-white dark:bg-slate-900">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold">상세 정보 — {selected.symbol}</h3>
                <div className="ml-auto flex gap-2">
                  <Button size="1"
                    onClick={() => {
                      // 모달 내에서 raw JSON 복사 기능(선택사항)
                      navigator.clipboard?.writeText(JSON.stringify(selected, null, 2));
                    }}
                  >
                    복사
                  </Button>
                  <Button size="1" color="amber" onClick={closeDetail}>
                    닫기
                  </Button>
                </div>
              </div>

              <hr className="my-3" />

              {/* JSON pretty 출력 */}
              <pre className="whitespace-pre-wrap text-sm overflow-auto rounded-md bg-slate-50 p-3 dark:bg-slate-800">
                {JSON.stringify(selected, null, 2)}
              </pre>
            </div>
          </div>
        )
      }
    </div >
  );
}
