"use client";

import React, { useEffect, useState } from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Tooltip from "@radix-ui/react-tooltip";
import { UsCapitalStockItem, UsCapitalType } from "@/lib/features/capital/capitalSlice";
import { Box, Button, Flex, Grid, Text } from "@radix-ui/themes";

interface Props {
  data: UsCapitalType;
  doAllTokenPlus: any;
  doAllTokenMinus: any;
  className?: string;
}

const HEADERS: { key: keyof UsCapitalStockItem | "actions"; label: string }[] = [
  { key: "symbol", label: "심볼" },
  { key: "key", label: "Key" },
  { key: "ncavRatio", label: "NCAV 비율" },
  { key: "token", label: "Token" },
  { key: "action", label: "Action" },
  { key: "condition", label: "Condition" },
  { key: "actions", label: "동작" },
];

export default function StockListTable({ data, doAllTokenPlus, doAllTokenMinus, className = "" }: Props) {
  const rows = data?.stock_list ?? [];

  // 선택된 항목과 모달 열림 상태
  const [selected, setSelected] = useState<UsCapitalStockItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);

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
        <div className="text-sm">
          상태: {data?.state}
        </div>
        <Flex direction="column" align="center" justify="center" gap="1">
          <Text>time_stamp:</Text>
          <div className="text-sm">
            <span className="font-medium">{new Date(data.time_stamp.prevPrev).toLocaleString()}</span>
          </div>
          <div className="text-sm">
            <span className="font-medium">{new Date(data.time_stamp.prev).toLocaleString()}</span>
          </div> <div className="text-sm">
            <span className="font-medium">{new Date(data.time_stamp.current).toLocaleString()}</span>
          </div>
        </Flex>
        <Flex direction="column">
          <div className="text-sm">
            Token per Stock: {data.token_info.token_per_stock} • Refill Index: {data.token_info.refill_stock_index}
          </div>
          <Flex direction="column" align="center" justify="center" py="1" my="1" className="border-2 rounded-xl">
            <Text>all TOKEN</Text>
            <Grid columns="1" gap="1" align="center" justify="center">
              <Flex gap="1" align="center" justify="end">
                <Text>₩10,000</Text>
                <Button onClick={() => doAllTokenPlus(10_000)} size="2">+</Button>
                <Button onClick={() => doAllTokenMinus(10_000)} size="2" color="tomato" >-</Button>
              </Flex>
              <Flex gap="1" align="center" justify="end">
                <Text>₩100,000</Text>
                <Button onClick={() => doAllTokenPlus(100_000)} size="2" >+</Button>
                <Button onClick={() => doAllTokenMinus(100_000)} size="2" color="tomato" >-</Button>
              </Flex>
              <Flex gap="1" align="center" justify="end">
                <Text>₩1,000,000</Text>
                <Button onClick={() => doAllTokenPlus(1_000_000)} size="2" >+</Button>
                <Button onClick={() => doAllTokenMinus(1_000_000)} size="2" color="tomato"  >-</Button>
              </Flex>
            </Grid>
          </Flex>
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
                      className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider bg-white dark:bg-black border-b sticky top-0 z-20"
                      style={idx === 0 ? { position: "sticky", left: 0, zIndex: 30 } : {}}
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
                  rows.map((row, rIndex) => (
                    <tr key={`${row.key}-${rIndex}`} className={rIndex % 2 === 0 ? "bg-white dark:bg-black" : "bg-slate-50 dark:bg-slate-800"}>
                      {HEADERS.map((h, cIndex) => {
                        if (h.key === "actions") {
                          return (
                            <td key={`cell-${rIndex}-${cIndex}`} className="px-3 py-2 whitespace-nowrap border-b">
                              <div className="flex gap-2">
                                <Button size="1" disabled>refill TOKEN</Button>
                              </div>
                            </td>
                          );
                        }

                        if (h.key === "condition") {
                          return (
                            <td key={`cell-${rIndex}-${cIndex}`} className="px-3 py-2 whitespace-nowrap border-b">
                              <div className="flex gap-2">
                                {/* 상세 버튼에 openDetail 연결 */}
                                <Button size="1" onClick={() => openDetail(row)} aria-haspopup="dialog">상세</Button>
                              </div>
                            </td>
                          );
                        }

                        const key = h.key as keyof UsCapitalStockItem;
                        const value = row[key] ?? "-";

                        return (
                          <td
                            key={`cell-${rIndex}-${cIndex}`}
                            className={`px-3 py-2 align-top border-b ${rIndex % 2 === 0 ? "bg-white dark:bg-black" : "bg-slate-50 dark:bg-slate-800"}`}
                            style={cIndex === 0 ? { position: "sticky", left: 0, zIndex: 10 } : {}}
                          >
                            <Tooltip.Root>
                              <Tooltip.Trigger asChild>
                                <div className="max-w-[180px] truncate" title={String(value)}>
                                  <div className="text-sm">{String(value)}</div>
                                </div>
                              </Tooltip.Trigger>
                              <Tooltip.Portal>
                                <Tooltip.Content side="top" align="center" className="rounded-md px-2 py-1 text-xs bg-slate-800 text-white">
                                  {String(value)}
                                  <Tooltip.Arrow className="fill-current" />
                                </Tooltip.Content>
                              </Tooltip.Portal>
                            </Tooltip.Root>
                          </td>
                        );
                      })}
                    </tr>
                  ))
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
