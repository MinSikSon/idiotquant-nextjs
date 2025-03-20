
"use client";

import * as React from "react";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { Card, Typography } from "@material-tailwind/react";
// import { SelectFace3d } from "iconoir-react";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "next-themes";

function rgbToHex(rgb: any) {
    return (
        "#" +
        rgb
            .map((x: any) => {
                const hex = parseInt(x, 10).toString(16);
                return hex.length === 1 ? "0" + hex : hex;
            })
            .join("")
    );
}

export default function LineChart(props: any) {
    console.log(`[LineChart]`, `props`, props);
    const { theme } = useTheme();
    const [vars, setVars] = React.useState<CSSStyleDeclaration | null>(null);

    React.useEffect(() => {
        const cssVarValue = window.getComputedStyle(document.documentElement);

        setVars(cssVarValue);
    }, [theme]);

    const chartColor = vars
        ? rgbToHex(vars.getPropertyValue("--color-primary").split(" "))
        : "";
    const textColor = vars
        ? rgbToHex(vars.getPropertyValue("--color-foreground").split(" "))
        : "";
    const lineColor = vars
        ? rgbToHex(vars.getPropertyValue("--color-surface").split(" "))
        : "";

    function getCumulateTokenArray() {
        let cumulateToken = 0
        const purchase_log = (props.market == "KR" ? props.purchase_log_kr : props.purchase_log_us);
        const cumulateTokenArray = purchase_log.map((entry: any) => {
            cumulateToken += entry.stock_list.reduce((sum: any, stock: any) => sum + Number(stock.remaining_token), 0);
            return Number(cumulateToken).toFixed(0);
        }
        );
        // console.log(`cumulateTokenArray`, cumulateTokenArray);
        return cumulateTokenArray;
    }

    function getCumulatePurchaseArray() {
        let cumulatePurchase = 0
        const purchase_log = (props.market == "KR" ? props.purchase_log_kr : props.purchase_log_us);
        const cumulatePurchaseArray = purchase_log.map((entry: any) => {
            cumulatePurchase += entry.stock_list.reduce((sum: any, stock: any) => {
                return sum + (Number(stock.stck_prpr) * Number(stock.ORD_QTY)) * (stock.buyOrSell == "sell" ? -1 : 1) * (props.market == "KR" ? 1 : props.frst_bltn_exrt);
            }, 0);
            return Number(cumulatePurchase).toFixed(0);
        }
        );
        // console.log(`cumulatePurchaseArray`, cumulatePurchaseArray);
        return cumulatePurchaseArray;
    }

    function getCategoryArray() {
        const purchase_log = (props.market == "KR" ? props.purchase_log_kr : props.purchase_log_us);
        return purchase_log.map((entry: any) => entry.time_stamp);
    }

    const chartConfig = React.useMemo(
        () =>
            ({
                type: "line",
                height: 240,
                series: [
                    {
                        name: "누적 포인트",
                        // data: test_data.stock_list.map((stock: any) => stock.remaining_token),
                        // data: [10, 20, 30, 40, 50, 60, 70, 80, 90],
                        data: getCumulateTokenArray(),
                        color: "#FF4560",
                    },
                    {
                        name: "매수 - 매도",
                        // data: test_data.stock_list.map((stock: any) => stock.stck_prpr * stock.ORD_QTY),
                        // data: [50, 60, 70, 80, 90, 10, 20, 30, 40],
                        data: getCumulatePurchaseArray(),
                        color: "#0088CC",
                    },
                    // {
                    //     name: "Sales_b",
                    //     data: [350, 200, 230, 500, 50, 40, 300, 320, 500],
                    // },
                ],
                options: {
                    chart: {
                        toolbar: {
                            show: false,
                        },
                    },
                    title: {
                        show: "",
                    },
                    dataLabels: {
                        enabled: false,
                    },
                    colors: [chartColor],
                    stroke: {
                        curve: "smooth",
                        lineCap: "round",
                    },
                    markers: {
                        size: 0,
                    },
                    xaxis: {
                        axisTicks: {
                            show: false,
                        },
                        axisBorder: {
                            show: false,
                        },
                        labels: {
                            style: {
                                colors: textColor,
                                // fontSize: "12px",
                                fontSize: "6px",
                                fontFamily: "inherit",
                                fontWeight: 400,
                            },
                            show: false,
                        },
                        // categories: [
                        //     "Apr",
                        //     "May",
                        //     "Jun",
                        //     "Jul",
                        //     "Aug",
                        //     "Sep",
                        //     "Oct",
                        //     "Nov",
                        //     "Dec",
                        // ],
                        // categories: test_data.stock_list.map((stock: any) => stock.stock_name),
                        categories: getCategoryArray(),
                    },
                    yaxis: {
                        labels: {
                            style: {
                                colors: textColor,
                                fontSize: "8px",
                                fontFamily: "inherit",
                                fontWeight: 400,
                            },
                        },
                    },
                    grid: {
                        show: true,
                        borderColor: lineColor,
                        strokeDashArray: 5,
                        xaxis: {
                            lines: {
                                show: true,
                            },
                        },
                        padding: {
                            top: 5,
                            right: 20,
                        },
                    },
                    fill: {
                        opacity: 0.8,
                    },
                    tooltip: {
                        theme: "dark",
                    },
                },
            }) as ApexOptions,
        [props.market, props.purchase_log_kr, props.purchase_log_us]);

    return (
        <Card>
            {/* <Card.Header className="m-0 flex flex-wrap items-center gap-4 p-4">
                <Card
                    color="primary"
                    className="grid h-16 w-16 shrink-0 place-items-center rounded-md text-primary-foreground md:h-20 md:w-20"
                >
                    <SelectFace3d className="h-6 w-6 md:h-8 md:w-8" />
                </Card>
                <div>
                    <Typography type="h6">Line Chart</Typography>
                    <Typography className="mt-1 max-w-sm text-foreground">
                        Visualize your data in a simple way using the
                        @material-tailwind/react chart plugin.
                    </Typography>
                </div>
            </Card.Header> */}
            <Card.Body>
                <Chart {...chartConfig} />
            </Card.Body>
        </Card>
    );
}
