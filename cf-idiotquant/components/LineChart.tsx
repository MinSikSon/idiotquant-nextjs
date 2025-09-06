
"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import type { ApexOptions } from "apexcharts";
import { useTheme } from "next-themes";
// import { enAU } from "date-fns/locale";

const DEBUG = false;

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
    if (DEBUG) console.log(`[LineChart]`, `props`, props);
    const { theme } = useTheme();
    const [vars, setVars] = useState<CSSStyleDeclaration | null>(null);

    useEffect(() => {
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

    const chartConfig = useMemo(
        () =>
            ({
                type: !!props.type ? props.type : "area",
                // type: "area",
                // stacked: true,
                background: "transparent",
                // type: "bar",
                fill: {
                    type: "gradient",
                    gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.6,
                        opacityTo: 0.2,
                        stops: [0, 90, 100],
                    },
                },
                // height: 240, // chart 높이
                // height: 120, // chart 높이
                height: props.height ?? 120, // chart 높이
                width: props.width ?? "100%", // chart 너비
                zoom: {
                    enabled: false, // 줌 비활성화
                },
                series: props.data_array,
                options: {
                    chart: {
                        zoom: {
                            enabled: false, // 줌 비활성화
                        },
                        toolbar: {
                            show: false,
                            zoom: false,
                            zoomin: false,
                            zoomout: false,
                        },
                    },
                    dataLabels: {
                        enabled: false,
                    },
                    // colors: [chartColor],
                    colors: [chartColor],
                    stroke: {
                        curve: "smooth",
                        lineCap: "round",
                        width: 2, // 선 두께
                        color: !!props.stroke_color ? props.stroke_color : "white"
                    },

                    markers: {
                        size: 0,
                        sizeOnHover: 0, // 마우스 오버 시에도 마커 표시 안 함
                        colors: "transparent", // 마커 색상을 투명하게 설정하여 흰색 마커 방지
                        strokeColors: "transparent", // 테두리도 투명하게 설정
                        ...props.markers,
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
                            show: props.show_yaxis_label ?? true,
                        },
                    },
                    grid: {
                        // show: true,
                        show: false,
                        borderColor: lineColor,
                        strokeDashArray: 0,
                        xaxis: {
                            lines: {
                                // show: true,
                                show: false,
                            },
                        },
                        padding: {
                            top: -25, // 상단 여백 제거
                            bottom: -35, // 하단 여백 제거
                            right: 20,
                        },
                    },
                    // fill: {
                    //     // opacity: 0.8,
                    //     opacity: 1,
                    // },
                    tooltip: {
                        theme: "dark",
                    },
                },
            }) as ApexOptions,
        [props.data_array, props.category_array]);

    return <>
        <Chart {...chartConfig} />
    </>;
}
