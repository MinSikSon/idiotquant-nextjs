
"use client";

import * as React from "react";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { Card, Typography } from "@material-tailwind/react";
// import { SelectFace3d } from "iconoir-react";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "next-themes";
import { SelectFace3d } from "iconoir-react";

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

    const chartConfig = React.useMemo(
        () =>
            ({
                type: "line",
                // height: 240, // chart 높이
                height: 120, // chart 높이
                series: props.data_array,
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
                        width: 3,
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
                        // tickAmount: 2, // 최소 2개의 tick만 표시 (시작과 끝)
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
                        categories: props.category_array,
                    },
                    yaxis: {
                        labels: {
                            style: {
                                colors: textColor,
                                fontSize: "8px",
                                fontFamily: "inherit",
                                fontWeight: 400,
                            },
                            // offsetY: -5,
                        },
                    },
                    grid: {
                        // show: true,
                        show: false,
                        borderColor: lineColor,
                        strokeDashArray: 5,
                        xaxis: {
                            lines: {
                                show: true,
                            },
                        },
                        // padding: {
                        //     top: 5,
                        //     right: 20,
                        // },
                        padding: {
                            top: -20, // 상단 여백 제거
                            bottom: -20, // 하단 여백 제거
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
        [props.data_array, props.category_array]);

    return <>
        <div className="">
            <Chart {...chartConfig} />
        </div>
        {/* <Card>
            <Card.Header className="m-0 flex flex-wrap items-center gap-4 p-4">
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
            </Card.Header>
            <Card.Body>
                <Chart {...chartConfig} />
            </Card.Body>
        </Card> */}
    </>;
}
