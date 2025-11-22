import React, { useEffect, useState } from "react";

import { DesignButton } from "./designButton";
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";
import { Box, Button, Card, Flex, Spinner, Table, Text } from "@radix-ui/themes";

const DEBUG = false;
export interface Example8TableRowType {
    id: any;
    column_1?: any;
    column_2: any;
    column_3: any;
    column_4: any;
    expectedRateOfReturnColor?: any;
    column_5?: any;
    column_6: any;
    column_7?: any;
    column_8?: any;
    column_9?: any;
    column_10?: any;
    column_11?: any;
    column_12?: any;
    bgColor?: any;
    column_13?: any;
    column_14?: any;
    column_15?: any;
    column_16?: any;
}

export interface Example8TableHeadType {
    head: string;
    desc?: string;
    customeStyle?: string;
}

export interface TablesExample8PropsType {
    title: any;
    msg?: any;
    desc: any;
    financial_date?: any;
    market_date?: any;
    tableHead: Example8TableHeadType[];
    selectHead?: any;
    setSelectHead?: any;
    prevSelectHead?: any;
    setPrevSelectHead?: any;

    tableRow: Example8TableRowType[];

    visibleCount?: any;
    setVisibleCount?: any;
}

export default function TableTemplate({
    title,
    msg,
    desc,
    financial_date,
    market_date,
    tableHead,
    selectHead,
    setSelectHead,
    prevSelectHead,
    setPrevSelectHead,
    tableRow,
    visibleCount,
    setVisibleCount,
}: TablesExample8PropsType) {

    const [fixed, setFixed] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 160) {
                setFixed(true);
            } else {
                setFixed(false);
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const ADD_COUNT = 50;
    return (
        <>
            <Box className="flex flex-col justify-between w-full p-0 m-0">
                <div className="">
                    {title}
                </div>
                <div className="">
                    {desc}
                </div>
                <div className="">
                    {financial_date}
                </div>
                <div className="">
                    {market_date}
                </div>
            </Box>
            {tableRow.length == 0 ?
                <Button variant="ghost">{!!msg ? <>{msg}</> : <><Spinner /> {DEBUG ? "6" : ""}</>}</Button>
                :
                <>
                    {/* <Box className="overflow-scroll [scrollbar-width:thin] [scrollbar-color:#888_transparent] !px-0 pt-0 pb-2 dark:bg-black"> */}
                    <Box p="1">
                        {/* <Table.Root className="w-full min-w-max table-auto items-center"> */}
                        {undefined == visibleCount || visibleCount > 0 ?
                            <Table.Root layout="auto">
                                <Table.Header>
                                    <Table.Row>
                                        {tableHead.map(({ head }, idx) => (
                                            <Table.ColumnHeaderCell minWidth="100px" align="center" p="0" pr="1" key={head} className={`!items-center !bg-white dark:!bg-black sticky ${0 == idx || 1 == idx ? `left-0 z-10` : ""}`}>
                                                <Box onClick={() => {
                                                    console.log(`setSelectHead`, !!setSelectHead, setSelectHead);
                                                    if (!!!setSelectHead) {
                                                        return; // do nothing
                                                    }
                                                    if (prevSelectHead == selectHead) {
                                                        setPrevSelectHead("");
                                                    }
                                                    else {
                                                        setPrevSelectHead(selectHead);
                                                    }
                                                    setSelectHead(head)
                                                }}>
                                                    {/* <div className={`font-mono flex font-bold dark:text-white cursor-pointer ${head.length >= 6 ? "text-[0.6rem]" : ""}`}> */}
                                                    <Flex minWidth="64px" direction="row" className="cursor-pointer" align="center">
                                                        <Text size="3">
                                                            {(prevSelectHead == head && selectHead == head) ? "↑" : (selectHead == head ? "↓" : "")}
                                                            {head}
                                                        </Text>
                                                    </Flex>
                                                </Box>
                                            </Table.ColumnHeaderCell>
                                        ))}
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {tableRow.slice(0, visibleCount).map(
                                        (
                                            {
                                                id,
                                                column_1,
                                                column_2,
                                                column_3,
                                                column_4,
                                                expectedRateOfReturnColor,
                                                column_5,
                                                column_6,
                                                column_7,
                                                column_8,
                                                column_9,
                                                column_10,
                                                column_11,
                                                column_12,
                                                column_13,
                                                column_14,
                                                column_15,
                                                column_16,
                                                bgColor,
                                            },
                                            index
                                        ) => {
                                            return (
                                                <Table.Row key={id} className="text-[0.8rem]">
                                                    <Table.RowHeaderCell p="0" pr="1" className="sticky z-0 left-0 !bg-white dark:!bg-black">{column_1}</Table.RowHeaderCell>
                                                    <Table.RowHeaderCell p="0" pr="1" className="sticky z-10 left-0 !bg-white dark:!bg-black">{column_2}</Table.RowHeaderCell>
                                                    <Table.Cell p="0" pr="1">{column_3}</Table.Cell>
                                                    <Table.Cell p="0" pr="1" className={`${expectedRateOfReturnColor}`} >
                                                        {column_4}
                                                    </Table.Cell>
                                                    <Table.Cell p="0" pr="1">{column_5}</Table.Cell>
                                                    <Table.Cell p="0" pr="1">{column_6}</Table.Cell>
                                                    <Table.Cell p="0" pr="1">{column_7}</Table.Cell>
                                                    <Table.Cell p="0" pr="1">{column_8}</Table.Cell>
                                                    <Table.Cell p="0" pr="1">{column_9}</Table.Cell>
                                                    <Table.Cell p="0" pr="1">{column_10}</Table.Cell>
                                                    <Table.Cell p="0" pr="1">{column_11}</Table.Cell>
                                                    <Table.Cell p="0" pr="1">{column_12}</Table.Cell>
                                                    <Table.Cell p="0" pr="1">{column_13}</Table.Cell>
                                                    <Table.Cell p="0" pr="1">{column_14}</Table.Cell>
                                                    <Table.Cell p="0" pr="1">{column_15}</Table.Cell>
                                                    <Table.Cell p="0" pr="1">{column_16}</Table.Cell>
                                                </Table.Row>
                                            );
                                        }
                                    )}
                                </Table.Body>
                            </Table.Root>
                            : <></>}
                    </Box>
                    {!!setVisibleCount ? <DesignButton
                        handleOnClick={() => setVisibleCount((prev: any) => prev + ADD_COUNT)}
                        buttonName={`trade history (more +${ADD_COUNT})`}
                        buttonBgColor="bg-white dark:bg-black"
                        buttonBorderColor="border-black dark:border-white"
                        buttonShadowColor="#D5D5D5"
                        textStyle="text-xs font-bold dark:text-white"
                        buttonStyle={`rounded-lg p-2 ml-2 flex items-center justify-center mb-2 button bg-white cursor-pointer select-none
                                     active:translate-y-1 active:[box-shadow:0_0px_0_0_#D5D5D5,0_0px_0_0_#D5D5D541] active:border-[0px]
                                     transition-all duration-150 [box-shadow:0_4px_0_0_#D5D5D5,0_8px_0_0_#D5D5D541] border-[1px]
                                     `}
                    />
                        : <></>}
                </>
            }
        </>
    );
}