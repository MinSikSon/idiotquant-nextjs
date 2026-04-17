"use client";

import React, { useState, useMemo } from "react";
import {
  Button,
  ButtonGroup,
  Card,
  Elevation,
  HTMLTable,
  Tag,
  Divider,
  Dialog,
  Text,
  H5,
  H6,
  Intent,
  Icon,
  Section,
  SectionCard,
  Tooltip,
  NonIdealState,
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import { UsCapitalStockItem, KrUsCapitalType } from "@/lib/features/capital/capitalSlice";

interface Props {
  data?: KrUsCapitalType;
  kakaoTotal: any;
  doTokenPlusAll: (val: number) => void;
  doTokenPlusOne: (val: number, sym: string) => void;
  doTokenMinusAll: (val: number) => void;
  doTokenMinusOne: (val: number, sym: string) => void;
  className?: string;
  session: any;
}

export default function StockListTable({
  data,
  kakaoTotal,
  doTokenPlusAll,
  doTokenPlusOne,
  doTokenMinusAll,
  doTokenMinusOne,
  className = "",
  session,
}: Props) {

  const rows = data?.stock_list ?? [];
  const [selected, setSelected] = useState<UsCapitalStockItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // 관리자 여부 확인
  const isMaster = useMemo(() =>
    session?.user?.name === process.env.NEXT_PUBLIC_MASTER,
    [session]);

  const tokenAmounts = [10000, 100000, 1000000];

  return (
    <div className={`w-full ${className}`}>
      {/* 1. Global Token Control (Only for Master) */}
      {isMaster && (
        <div className="mb-6 animate-in slide-in-from-top-2 duration-500">
          <Section
            title="Global Token Master Control"
            icon={IconNames.KEY_COMMAND}
            rightElement={
              <Tag intent={Intent.DANGER} minimal className="font-mono">MASTER ONLY</Tag>
            }
          >
            <SectionCard className="flex flex-wrap items-center gap-3 bg-zinc-100/50 dark:!bg-zinc-900/50">
              <Text className="text-xs font-bold opacity-60 uppercase">Batch Refill:</Text>
              {[50000, 100000, 500000, 1000000].map(amt => (
                <ButtonGroup key={`batch-${amt}`} className="shadow-sm">
                  <Button
                    text={`+${amt / 10000}만`}
                    small
                    onClick={() => doTokenPlusAll(amt)}
                    intent={Intent.PRIMARY}
                  />
                  <Button
                    icon={IconNames.MINUS}
                    small
                    onClick={() => doTokenMinusAll(amt)}
                    intent={Intent.DANGER}
                  />
                </ButtonGroup>
              ))}
            </SectionCard>
          </Section>
        </div>
      )}

      {/* 2. Data Display Area */}

      {/* --- Mobile View (Card List) --- */}
      {/* <div className="block md:hidden space-y-4">
        {rows.length === 0 ? (
          <NonIdealState icon={IconNames.SEARCH} title="운용 종목 없음" description="현재 알고리즘이 관리 중인 종목이 없습니다." />
        ) : (
          rows.map((row, idx) => (
            <Card key={`card-${idx}`} elevation={Elevation.ONE} className="p-4 border-t-2 border-primary bg-white dark:!bg-zinc-900">
              <div className="flex justify-between items-center mb-4">
                <H5 className="m-0 font-black !text-blue-600 tracking-tighter">{row.symbol}</H5>
                <Tag minimal intent={Number(row.ncavRatio) > 1 ? Intent.SUCCESS : Intent.NONE}>
                  NCAV {row.ncavRatio}
                </Tag>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                <div className="bg-zinc-50 dark:!bg-zinc-800 p-2 rounded">
                  <p className="opacity-50 mb-1 font-bold">Price</p>
                  <p className="font-mono">₩{Number(row.condition?.LastPrice || 0).toLocaleString()}</p>
                </div>
                <div className="bg-zinc-50 dark:!bg-zinc-800 p-2 rounded">
                  <p className="opacity-50 mb-1 font-bold">Token</p>
                  <p className="font-mono !text-blue-500 font-bold">{row.token?.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button icon={IconNames.EYE_OPEN} minimal text="상세" onClick={() => { setSelected(row); setIsOpen(true); }} />
                {isMaster && (
                  tokenAmounts.map(amt => (
                    <ButtonGroup key={`dt-${amt}`} className="shadow-xs">
                      <Button
                        small
                        text={`${amt / 10000}만`}
                        onClick={() => doTokenPlusOne(amt, row.symbol)}
                      />
                      <Button
                        small
                        icon={IconNames.MINUS}
                        intent={Intent.DANGER}
                        onClick={() => doTokenMinusOne(amt, row.symbol)}
                      />
                    </ButtonGroup>
                  )))
                }
              </div>
            </Card>
          ))
        )}
      </div> */}

      {/* --- Desktop View (Table) --- */}
      {/* <div className="hidden md:block overflow-hidden border rounded-xl shadow-sm bg-white dark:!bg-zinc-900 border-zinc-200 dark:border-zinc-800"> */}
      <div className="block overflow-hidden border rounded-xl shadow-sm bg-white dark:!bg-zinc-900 border-zinc-200 dark:border-zinc-800">
        <HTMLTable interactive className="w-full text-[11px]" striped>
          <thead className="bg-zinc-50 dark:!bg-zinc-800">
            <tr>
              <th className="p-4">종목</th>
              <th>PER</th>
              <th>PBR</th>
              <th>BPS / EPS</th>
              <th>시가총액</th>
              <th>NCAV 비율</th>
              <th>Token</th>
              {isMaster && <th className="text-right p-4">Individual Refill</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={`row-${idx}`}>
                <td className="p-4">
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:!text-blue-500 transition-colors"
                    onClick={() => { setSelected(row); setIsOpen(true); }}
                  >
                    <Icon icon={IconNames.DOCUMENT_SHARE} size={14} className="opacity-50" />
                    <span className="font-black text-sm tracking-tight">{row.symbol}</span>
                  </div>
                </td>
                <td className="font-mono">{row.condition?.per || "-"}</td>
                <td className="font-mono">{row.condition?.pbr || "-"}</td>
                <td>
                  <div className="flex flex-col leading-tight">
                    <span className="font-mono font-bold">B: {row.condition?.bps?.toLocaleString()}</span>
                    <span className="opacity-40 text-[9px]">E: {row.condition?.eps?.toLocaleString()}</span>
                  </div>
                </td>
                <td className="font-mono">₩{(row.condition?.MarketCapitalization || 0).toLocaleString()}억</td>
                <td>
                  <Tooltip content={`NCAV Ratio: ${row.ncavRatio}`} position="top">
                    <Tag
                      minimal
                      intent={Number(row.ncavRatio) > 1 ? Intent.SUCCESS : Intent.NONE}
                      className="font-bold font-mono"
                    >
                      {row.ncavRatio}
                    </Tag>
                  </Tooltip>
                </td>
                <td className="font-mono font-black !text-blue-500">{row.token?.toLocaleString()}</td>
                {isMaster && (
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      {tokenAmounts.map(amt => (
                        <ButtonGroup key={`dt-${amt}`} className="shadow-xs">
                          <Button
                            small
                            text={`${amt / 10000}만`}
                            onClick={() => doTokenPlusOne(amt, row.symbol)}
                          />
                          <Button
                            small
                            icon={IconNames.MINUS}
                            intent={Intent.DANGER}
                            onClick={() => doTokenMinusOne(amt, row.symbol)}
                          />
                        </ButtonGroup>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </HTMLTable>
      </div>

      {/* 3. Detail Analysis Dialog */}
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`Strategy Analysis: ${selected?.symbol}`}
        icon={IconNames.CHART}
        className="bp5-dark w-[95%] max-w-3xl"
      >
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <StatItem
              label="유동자산"
              value={`${(selected?.condition?.AssetsCurrent || 0).toLocaleString()}억`}
              icon={IconNames.CUBE}
            />
            <StatItem
              label="유동부채"
              value={`${(selected?.condition?.LiabilitiesCurrent || 0).toLocaleString()}억`}
              icon={IconNames.RESOLVE}
            />
            <StatItem
              label="당기순이익"
              value={`${(selected?.condition?.NetIncome || 0).toLocaleString()}억`}
              icon={IconNames.BANK_ACCOUNT}
            />
            <StatItem
              label="현재가"
              value={`₩${Number(selected?.condition?.LastPrice || 0).toLocaleString()}`}
              icon={IconNames.DOLLAR}
            />
          </div>

          <Divider />

          <div className="mt-6 space-y-4">
            <H6 className="uppercase opacity-40 font-black tracking-widest text-[10px]">Technical Metadata</H6>
            <pre className="p-5 bg-zinc-100 dark:!bg-zinc-800/50 rounded-xl text-[11px] overflow-auto max-h-[40vh] font-mono border border-zinc-200 dark:border-zinc-700 leading-relaxed">
              {JSON.stringify(selected, null, 2)}
            </pre>
          </div>

          <div className="flex justify-between items-center mt-8 pt-4 border-t dark:border-zinc-800">
            <Button icon={IconNames.DUPLICATE} text="JSON 복사" onClick={() => navigator.clipboard.writeText(JSON.stringify(selected))} minimal />
            <Button text="확인" intent={Intent.PRIMARY} large className="px-10" onClick={() => setIsOpen(false)} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

// 상세 페이지용 스탯 컴포넌트
function StatItem({ label, value, icon }: { label: string, value: string, icon: any }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 opacity-50">
        <Icon icon={icon} size={12} />
        <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
      </div>
      <Text className="text-lg font-mono font-black">{value}</Text>
    </div>
  );
}