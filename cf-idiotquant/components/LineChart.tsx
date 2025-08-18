
"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import type { ApexOptions } from "apexcharts";
import { useTheme } from "next-themes";
import { enAU } from "date-fns/locale";

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
                // type: !!props.type ? props.type : "line",
                type: "area",
                // stacked: true,
                background: "transparent",
                // type: "bar",
                stroke: {
                    curve: "smooth",
                    width: 2,
                },
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
                height: !!props.height ? props.height : 120, // chart 높이
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
                    title: {
                        text: `${props.category_array[0] ?? ""} ~ ${props.category_array[props.category_array.length - 1] ?? ""}`,
                        align: "right",  // 정렬 (left, center, right)
                        style: {
                            fontSize: "10px",
                        },
                        show: "",
                    },
                    dataLabels: {
                        enabled: false,
                    },
                    colors: [chartColor],
                    // stroke: {
                    //     curve: "smooth",
                    //     lineCap: "round",
                    //     width: 3, // 선 두께
                    // },

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
                        },
                    },
                    grid: {
                        show: true,
                        // show: false,
                        borderColor: lineColor,
                        strokeDashArray: 0,
                        xaxis: {
                            lines: {
                                // show: true,
                                show: false,
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
