
// //////////////////////////////////////////////////////////////////////////////
// // Chart
// // https://velog.io/@mokyoungg/React-React%EC%97%90%EC%84%9C-Canvas-%EC%82%AC%EC%9A%A9%ED%95%98%EA%B8%B0%EB%A7%88%EC%9A%B0%EC%8A%A4-%EA%B7%B8%EB%A6%AC%EA%B8%B0

// import React from "react";

// Chart.defaults.color = 'white';
// Chart.defaults.borderColor = 'white';

// export default class CustomChart extends React.Component {
//     constructor(props) {
//         super(props);
//         this.canvasRef = React.createRef(null);

//         this.drawGraph = this.drawGraph.bind(this);
//         this.addData = this.addData.bind(this);
//         this.removeData = this.removeData.bind(this);
//     }
//     drawGraph() {
//         if ('-' == this.props.tickerName) {
//             return;
//         }

//         function GetCloseAfterValidCheck(marketInfo) {
//             if (undefined == marketInfo) {
//                 return 0;
//             }

//             return (marketInfo['시가총액'] || 0) / (marketInfo['상장주식수'] || 1);
//         }

//         const close20181214 = GetCloseAfterValidCheck(this.props.marketInfo20181214['data'][this.props.tickerName]);
//         const close20191213 = GetCloseAfterValidCheck(this.props.marketInfo20191213['data'][this.props.tickerName]);
//         const close20201214 = GetCloseAfterValidCheck(this.props.marketInfo20201214['data'][this.props.tickerName]);
//         const close20211214 = GetCloseAfterValidCheck(this.props.marketInfo20211214['data'][this.props.tickerName]);
//         const close20221214 = GetCloseAfterValidCheck(this.props.marketInfo20221214['data'][this.props.tickerName]);
//         const close20230111 = GetCloseAfterValidCheck(this.props.marketInfo20230111['data'][this.props.tickerName]);
//         const latest = GetCloseAfterValidCheck(this.props.marketInfoLatest['data'][this.props.tickerName]);

//         const fairPrice = parseInt(this.props.fairPrice.replace(/,/g, ''));

//         const tempChart = new Chart(this.canvasRef.current, {
//             type: 'line',
//             data:
//             {
//                 labels: ['20181214', '20191213', '20201214', '20211214', '20221214', '20230111', this.props.bsnsFullDate],
//                 datasets:
//                     [
//                         {
//                             label: `주식가격`,
//                             data: [
//                                 close20181214,
//                                 close20191213,
//                                 close20201214,
//                                 close20211214,
//                                 close20221214,
//                                 close20230111,
//                                 latest
//                             ],
//                             borderWidth: 3,
//                             borderColor: 'rgba(9,125,243,1)', // blue
//                             // borderColor: 'rgba(255,255,255,1)', // white
//                             backgroundColor: 'rgba(9,125,243,0.5)', // blue
//                             // pointStyle: 'cross',
//                             // pointStyle: 'line',
//                             // pointStyle: 'crossRot',
//                             pointStyle: 'circle',
//                             pointRadius: 1,
//                             pointHoverRadius: 1,
//                             fill: true,
//                         },
//                         {
//                             label: `적정가격`,
//                             data: [
//                                 fairPrice,
//                                 fairPrice,
//                                 fairPrice,
//                                 fairPrice,
//                                 fairPrice,
//                                 fairPrice,
//                                 fairPrice,
//                             ],
//                             borderWidth: 4,
//                             borderColor: 'rgba(239,68,68,1)', // red
//                             // backgroundColor: 'rgba(239,68,68,0.3)', // red
//                             pointStyle: false,
//                             fill: true,
//                         }
//                     ]
//             },
//             options: {
//                 plugins: {
//                     legend: {
//                         display: this.props.display
//                     },
//                     tooltip: {
//                         enabled: this.props.display
//                     },
//                 },
//                 // animations: false,
//                 animations: {
//                     tension: {
//                         duration: 5000,
//                         easing: 'linear',
//                         from: 0.5,
//                         to: 0,
//                         loop: true
//                     },
//                 },
//                 scales: {
//                     y: {
//                         // beginAtZero: true,
//                         ticks: {
//                             // color: 'white'
//                         },
//                         display: this.props.display,
//                         beginAtZero: true,
//                         title: {
//                             display: true,
//                             text: 'PRICE(₩)',
//                         },
//                     },
//                     x: {
//                         ticks: {
//                             // color: 'white'
//                         },
//                         display: this.props.display
//                     }
//                 },
//                 responsive: this.props.responsive,
//                 maintainAspectRatio: this.props.responsive,
//                 interaction: {
//                     mode: 'index',
//                     intersect: false
//                 },
//             },
//         });

//         tempChart.resize(this.props.width, this.props.height);
//     }

//     addData(chart, label, data) {
//         chart.data.labels.push(label);
//         chart.data.datasets.forEach((dataset) => {
//             dataset.data.push(data);
//         });
//         chart.update();
//     }

//     removeData(chart) {
//         chart.data.labels.pop();
//         chart.data.datasets.forEach((dataset) => {
//             dataset.data.pop();
//         });
//         chart.update();
//     }

//     componentDidUpdate() {
//         if ('-' == this.props.tickerName) {
//             return;
//         }

//         // console.log(`componentDidUpdate`, this.props.tickerName, this.props.dictFilteredStockCompanyInfo)

//         if (!!this.props.dictFilteredStockCompanyInfo) {
//             const chart = Chart.getChart(this.canvasRef.current);
//             chart.destroy();

//             this.drawGraph();
//         }
//     }

//     componentDidMount() {
//         this.drawGraph();
//     }

//     componentWillUnmount() {
//     }

//     render() {
//         return (
//             <canvas ref={this.canvasRef}></canvas>
//         );
//     }
// }