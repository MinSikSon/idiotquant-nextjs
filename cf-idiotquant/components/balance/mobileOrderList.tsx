"use client";

import { ChevronDown } from "lucide-react";
import { EmptyState } from "./shared";
import { cn } from "@/lib/utils";

export interface MobileOrder {
  id: string;
  name: string;
  buy: boolean;
  side: string;
  time: string;
  price: string;
  quantity: string;
  details: { label: string; value: string }[];
}

export function MobileOrderList({ orders, emptyMessage }: { orders: MobileOrder[]; emptyMessage: string }) {
  return (
    <div className="space-y-1.5 md:hidden">
      {orders.length === 0 && <EmptyState message={emptyMessage} />}
      {orders.map((order, index) => (
        <details key={`${order.id}-${index}`} className="group/order rounded-xl border border-neutral-200 dark:border-border-subtle-dark">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-2.5 py-2 [&::-webkit-details-marker]:hidden">
            <span className={cn("max-w-[30%] shrink-0 truncate rounded-md px-1.5 py-1 text-[10px] font-bold", order.buy ? "bg-red-50 text-red-500 dark:bg-red-950/40" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400")}>{order.side}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold text-neutral-900 dark:text-white">{order.name}</span>
              <span className="block text-[10px] text-neutral-500 dark:text-neutral-400">{order.time}</span>
            </span>
            <span className="min-w-0 max-w-[45%] text-right tabular-nums">
              <span className="block break-words text-xs font-bold text-neutral-900 dark:text-white">{order.price}</span>
              <span className="block text-[10px] text-neutral-500 dark:text-neutral-400">{order.quantity}</span>
            </span>
            <ChevronDown size={14} className="shrink-0 text-neutral-400 transition-transform group-open/order:rotate-180" />
          </summary>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-neutral-100 px-3 py-2.5 text-xs dark:border-border-subtle-dark">
            <div className="col-span-2 min-w-0"><dt className="text-[10px] text-neutral-500 dark:text-neutral-400">종목</dt><dd className="mt-0.5 break-words font-semibold text-neutral-800 dark:text-neutral-200">{order.name}</dd></div>
            {order.details.map(detail => <div key={detail.label} className="min-w-0"><dt className="text-[10px] text-neutral-500 dark:text-neutral-400">{detail.label}</dt><dd className="mt-0.5 break-words font-semibold tabular-nums text-neutral-800 dark:text-neutral-200">{detail.value}</dd></div>)}
          </dl>
        </details>
      ))}
    </div>
  );
}
