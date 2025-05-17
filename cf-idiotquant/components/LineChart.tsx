"use client";

import * as React from "react";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { Card, Typography } from "@material-tailwind/react";
// import { SelectFace3d } from "iconoir-react";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "next-themes";
import { SelectFace3d } from "iconoir-react";

const DEBUG = false;

interface LineChartProps {
    data_array: any[];
    category_array: string[];
    height?: number;
    markers?: {
        size?: number;
        sizeOnHover?: number;
        colors?: string;
        strokeColors?: string;
    };
}

function rgbToHex(rgb: string[]): string {
    return (
        "#" +
        rgb
            .map((x) => {
                const hex = parseInt(x, 10).toString(16);
                return hex.length === 1 ? "0" + hex : hex;
            })
            .join("")
    );
}

const LineChartComponent = ({
    data_array,
    category_array,
    height = 120,
    markers = {}
}: LineChartProps) => {
    const { theme } = useTheme();
    const [vars, setVars] = React.useState<CSSStyleDeclaration | null>(null);

    React.useEffect(() => {
        const cssVarValue = window.getComputedStyle(document.documentElement);
        setVars(cssVarValue);
    }, [theme]);

    const chartColor = React.useMemo(() =>
        vars ? rgbToHex(vars.getPropertyValue("--color-primary").split(" ")) : "",
        [vars]
    );

    const textColor = React.useMemo(() =>
        vars ? rgbToHex(vars.getPropertyValue("--color-foreground").split(" ")) : "",
        [vars]
    );

    const lineColor = React.useMemo(() =>
        vars ? rgbToHex(vars.getPropertyValue("--color-surface").split(" ")) : "",
        [vars]
    );

    const chartConfig = React.useMemo(
        () => ({
            type: "area",
            background: "transparent",
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
            height,
            zoom: {
                enabled: false,
            },
            series: data_array,
            options: {
                chart: {
                    toolbar: {
                        show: false,
                    },
                },
                title: {
                    text: `${category_array[0] ?? ""} ~ ${category_array[category_array.length - 1] ?? ""}`,
                    align: "right",
                    style: {
                        fontSize: "10px",
                    },
                    show: "",
                },
                dataLabels: {
                    enabled: false,
                },
                colors: [chartColor],
                markers: {
                    size: 0,
                    sizeOnHover: 0,
                    colors: "transparent",
                    strokeColors: "transparent",
                    ...markers,
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
                            fontSize: "6px",
                            fontFamily: "inherit",
                            fontWeight: 400,
                        },
                        show: false,
                    },
                    categories: category_array,
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
                    strokeDashArray: 0,
                    xaxis: {
                        lines: {
                            show: false,
                        },
                    },
                    padding: {
                        top: -20,
                        bottom: -20,
                        right: 20,
                    },
                },
                tooltip: {
                    theme: "dark",
                },
            },
        }) as ApexOptions,
        [data_array, category_array, height, markers, chartColor, textColor, lineColor]
    );

    return (
        <div className="">
            <Chart {...chartConfig} />
        </div>
    );
};

LineChartComponent.displayName = 'LineChart';

export default React.memo(LineChartComponent);
