import React from "react";
import { Line } from "react-chartjs-2";
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

function GetCloseAfterValidCheck(marketInfo) {
    if (undefined == marketInfo) {
        return 0;
    }

    return (marketInfo['시가총액'] || 0) / (marketInfo['상장주식수'] || 1);
}


export default ({
    tickerName,
    marketInfoList,

    bsnsFullDate,
    fairPrice,

    display,
    responsive,

    height,
    width,
    className,
}) => {

    const closeList = [];
    const dateList = [];
    const fairPriceList = [];

    const fairPrice_ = parseInt(fairPrice.replace(/,/g, ''));

    marketInfoList.forEach((obj) => {
        closeList.push(GetCloseAfterValidCheck(obj['data'][tickerName]));
        dateList.push(obj['date']);
        fairPriceList.push(fairPrice_);
    });

    const data = {
        labels: dateList,
        datasets:
            [
                {
                    label: `주식가격`,
                    data: closeList,
                    borderWidth: 3,
                    borderColor: 'rgba(9,125,243,1)', // blue
                    // borderColor: 'rgba(255,255,255,1)', // white
                    backgroundColor: 'rgba(9,125,243,0.5)', // blue
                    // pointStyle: 'cross',
                    // pointStyle: 'line',
                    // pointStyle: 'crossRot',
                    pointStyle: 'circle',
                    pointRadius: 1,
                    pointHoverRadius: 1,
                    fill: true,
                },
                {
                    label: `적정가격`,
                    data: fairPriceList,
                    borderWidth: 4,
                    borderColor: 'rgba(239,68,68,1)', // red
                    // backgroundColor: 'rgba(239,68,68,0.3)', // red
                    pointStyle: false,
                    fill: true,
                }
            ]
    };

    return (
        <div>
            <Line
                data={data}
                height={height}
                width={width}
                options={{
                    plugins: {
                        legend: {
                            display: display
                        },
                        tooltip: {
                            enabled: display
                        },
                    },
                    animations: false,
                    animations: {
                        tension: {
                            duration: 5000,
                            easing: 'linear',
                            from: 0.5,
                            to: 0,
                            loop: true
                        },
                    },
                    scales: {
                        y: {
                            // beginAtZero: true,
                            ticks: {
                                // color: 'white'
                            },
                            display: display,
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'PRICE(₩)',
                            },
                        },
                        x: {
                            ticks: {
                                // color: 'white'
                            },
                            display: display
                        }
                    },
                    responsive: responsive,
                    maintainAspectRatio: responsive,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                }}
            />
        </div >
    );
}