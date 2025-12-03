"use client";

import React from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Tooltip from "@radix-ui/react-tooltip";
import { CapitalUsStockItem, CapitalUsType } from "@/lib/features/capital/capitalSlice";


interface Props {
  data: CapitalUsType;
  className?: string;
}

const HEADERS: { key: keyof CapitalUsStockItem | "actions"; label: string }[] = [
  { key: "symbol", label: "심볼" },
  { key: "key", label: "Key" },
  { key: "ncavRatio", label: "NCAV 비율" },
  { key: "token", label: "Token" },
  { key: "action", label: "Action" },
  { key: "actions", label: "동작" },
];

export default function StockListTable({ data, className = "" }: Props) {
  const rows = data?.stock_list ?? [];

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm">
          상태: {data?.state}
        </div>
        <div className="text-sm">
          현재시간: <span className="font-medium">{data.time_stamp.current}</span>
        </div>
        <div className="text-sm">
          Token per Stock: {data.token_info.token_per_stock} • Refill Index: {data.token_info.refill_stock_index}
        </div>
      </div>

      <ScrollArea.Root className="rounded-md border border-slate-200">
        <ScrollArea.Viewport className="w-full h-[420px]">
          <div className="min-w-[800px]">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr>
                  {HEADERS.map((h, idx) => (
                    <th key={String(h.key)} className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider bg-white dark:bg-black border-b sticky top-0 z-20" style={idx === 0 ? { position: "sticky", left: 0, zIndex: 30 } : {}}>
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
                                <button className="text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200">상세</button>
                                <button className="text-xs px-2 py-1 rounded-md bg-blue-50 dark:bg-slate-800 hover:bg-blue-100">매수/매도</button>
                              </div>
                            </td>
                          );
                        }

                        const key = h.key as keyof CapitalUsStockItem;
                        const value = row[key] ?? "-";

                        return (
                          <td key={`cell-${rIndex}-${cIndex}`} className={`px-3 py-2 align-top border-b ${rIndex % 2 === 0 ? "bg-white dark:bg-black" : "bg-slate-50 dark:bg-slate-800"}`} style={cIndex === 0 ? { position: "sticky", left: 0, zIndex: 10 } : {}}>
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
    </div>
  );
}
