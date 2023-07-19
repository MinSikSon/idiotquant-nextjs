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
    // marketInfo20181214,
    // marketInfo20191213,
    // marketInfo20201214,
    // marketInfo20211214,
    // marketInfo20221214,
    // marketInfo20230111,
    // marketInfoLatest,

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

    marketInfoList.forEach((obj) => {
        closeList.push(GetCloseAfterValidCheck(obj['data'][tickerName]));
        dateList.push(obj['date']);
    });

    // const close20181214 = GetCloseAfterValidCheck(marketInfo20181214['data'][tickerName]);
    // const close20191213 = GetCloseAfterValidCheck(marketInfo20191213['data'][tickerName]);
    // const close20201214 = GetCloseAfterValidCheck(marketInfo20201214['data'][tickerName]);
    // const close20211214 = GetCloseAfterValidCheck(marketInfo20211214['data'][tickerName]);
    // const close20221214 = GetCloseAfterValidCheck(marketInfo20221214['data'][tickerName]);
    // const close20230111 = GetCloseAfterValidCheck(marketInfo20230111['data'][tickerName]);
    // const latest = GetCloseAfterValidCheck(marketInfoLatest['data'][tickerName]);

    const fairPrice_ = parseInt(fairPrice.replace(/,/g, ''));

    const data = {
        // labels: ['20181214', '20191213', '20201214', '20211214', '20221214', '20230111', bsnsFullDate],
        labels: dateList,
        datasets:
            [
                {
                    label: `주식가격`,
                    // data: [
                    //     close20181214,
                    //     close20191213,
                    //     close20201214,
                    //     close20211214,
                    //     close20221214,
                    //     close20230111,
                    //     latest
                    // ],
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
                    data: [
                        fairPrice_,
                        fairPrice_,
                        fairPrice_,
                        fairPrice_,
                        fairPrice_,
                        fairPrice_,
                        fairPrice_,
                    ],
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