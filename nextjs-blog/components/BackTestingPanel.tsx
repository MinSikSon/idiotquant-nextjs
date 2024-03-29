import { ArchiveBoxIcon, ArrowUturnLeftIcon, BellIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";
import { Button, Card, Chip, ListItem, ListItemPrefix, Navbar, Switch, Timeline, TimelineConnector, TimelineHeader, TimelineIcon, TimelineItem, Typography, } from "@material-tailwind/react";
import React from "react";

export default function BackTestingPanel(props) {
  const [principal, setPrincipal] = React.useState(100000000);
  const [backTestResult, setBackTestResult] = React.useState({});
  const [stocks, setStocks] = React.useState([]);
  const [showStocks, setShowStocks] = React.useState(false);

  const getNCAV = () => {
    // console.log(`props.financialInfoList`, props.financialInfoList);
    // console.log(`props.marketInfoList`, props.marketInfoList);
    let selectedFinancialInfoList = [];

    for (let i = 0; i < props.marketInfoList.length; ++i) {
      const date = props.marketInfoList[i].date;
      const data = props.marketInfoList[i].data;
      const yearInDate: number = date.slice(0, 4);
      const monthInDate = date.slice(4, 6);
      const dayInDate = date.slice(6, 8);

      // 재무제표 선택
      let selectedFinancialInfo = {};
      for (let j = 0; j < Object.keys(props.financialInfoList).length; ++j) {
        const key: string = Object.keys(props.financialInfoList)[j];
        const subKey: string[] = key.split("_");
        const year: number = Number(subKey[1]);
        // const quarter:number = Number(subKey[2]);
        if (year + 1 == yearInDate) {
          selectedFinancialInfo = Object.values(props.financialInfoList)[j];
          selectedFinancialInfoList.push(selectedFinancialInfo);
          break;
        }
      }
    }

    // console.log(`selectedFinancialInfoList`, selectedFinancialInfoList);

    let mergedSelectedStockNameList = [];
    let mergedSelectedStockInfoList = [];
    // console.log(`selectedFinancialInfoList`, selectedFinancialInfoList);
    // console.log(`props.marketInfoList.length`, props.marketInfoList.length);
    for (let i = 0; i < Object.keys(selectedFinancialInfoList).length; ++i) {
      let selectedStockNameList = [];
      let selectedStockInfoList = [];
      let selectedFinancialInfo = selectedFinancialInfoList[i];
      // console.log(`Object.keys(props.marketInfoList[i].data).length`, Object.keys(props.marketInfoList[i].data).length);
      // console.log(`Object.keys(props.marketInfoList[i].data)`, Object.keys(props.marketInfoList[i].data));
      // console.log(`Object.values(props.marketInfoList[i].data)`, Object.values(props.marketInfoList[i].data));
      const keyOfMarketInfoList = Object.keys(props.marketInfoList[i].data);
      const valueOfMarketInfoList = Object.values(props.marketInfoList[i].data);
      for (let j = 0; j < keyOfMarketInfoList.length; ++j) {
        const keyOfMarketInfo = keyOfMarketInfoList[j];
        let valueOfMarketInfo = {};
        valueOfMarketInfo = valueOfMarketInfoList[j];
        // console.log(`valueOfMarketInfo`, valueOfMarketInfo);
        const 시가총액 = valueOfMarketInfo["시가총액"];
        if (!!!시가총액) continue;
        const 거래대금 = valueOfMarketInfo["거래대금"];
        if (!!!거래대금 || 거래대금 == 0) continue;
        const 상장주식수: number = (!!valueOfMarketInfo["상장주식수"]) ? Number(valueOfMarketInfo["상장주식수"]) : 0;
        if (상장주식수 == 0) continue;

        const financialInfo = selectedFinancialInfo[keyOfMarketInfo];
        const existFinancialInfo: boolean = !!financialInfo;
        // console.log(keyOfMarketInfo, valueOfMarketInfo, existFinancialInfo);
        if (false == existFinancialInfo) continue;

        const 유동자산 = selectedFinancialInfo[keyOfMarketInfo]["유동자산"];
        const 부채총계 = selectedFinancialInfo[keyOfMarketInfo]["부채총계"];
        const 당기순이익 = selectedFinancialInfo[keyOfMarketInfo]["당기순이익"];
        if (!!!유동자산) continue;
        if (!!!부채총계) continue;
        // if (!!!당기순이익 || 당기순이익 <= 0) continue;

        const filter = (a, b, c) => {
          if ((a - b) >= c) return true;
          return false;
        }

        if (false == filter(Number(유동자산), Number(부채총계), Number(시가총액) * 1)) continue;
        // console.log(keyOfMarketInfo, 유동자산, 부채총계, 시가총액);

        // if (Object.keys(props.marketInfoList[i])[j])
        selectedStockNameList.push(keyOfMarketInfo);
        selectedStockInfoList.push({ "종목명": keyOfMarketInfo, ...valueOfMarketInfo, ...selectedFinancialInfo[keyOfMarketInfo] });
      }
      mergedSelectedStockNameList.push(selectedStockNameList);
      mergedSelectedStockInfoList.push(selectedStockInfoList);
    }

    // console.log(`mergedSelectedStockNameList`, mergedSelectedStockNameList);
    // console.log(`mergedSelectedStockInfoList`, mergedSelectedStockInfoList);

    let logList = [];
    const 원금: number = principal;
    // logList.push([`(시작) 원금: ${원금}`]);
    let 최종_수익금: number = 원금;
    // 수익률 계산
    for (let i = 0; i < mergedSelectedStockNameList.length - 1; ++i) {
      const curDate = props.marketInfoList[i].date;
      const nextDate = props.marketInfoList[i + 1].date;

      const mergedSelectedStockName = mergedSelectedStockNameList[i];

      let 누적_수익률: number = 0;
      let 종목수: number = 0;
      for (let j = 0; j < mergedSelectedStockName.length; ++j) {
        const stockName: string = mergedSelectedStockName[j];
        const curMarketInfo = props.marketInfoList[i].data[stockName];
        const nextMarketInfo = props.marketInfoList[i + 1].data[stockName];

        let 수익률: number = 0;
        if (!!!curMarketInfo["상장주식수"]) {
          // console.log(`curMarketInfo`, curMarketInfo);
          return;
        }
        if (!!!nextMarketInfo) {
          // 상장 폐지 예상
          // console.log(`stockName`, stockName); // 엔케이물산
          // console.log(`nextMarketInfo`, nextMarketInfo);
          수익률 = -1;
        }
        else {
          if (curMarketInfo["상장주식수"] == nextMarketInfo["상장주식수"]) {
            const 현재_종가: number = Number(curMarketInfo["종가"]);
            const 다음_종가: number = Number(nextMarketInfo["종가"]);
            // console.log(`현재_종가`, 현재_종가, `-> 다음_종가`, 다음_종가);
            수익률 = (다음_종가 - 현재_종가) / 현재_종가;
          }
          else {
            const 현재_시가총액: number = Number(curMarketInfo["시가총액"]);
            const 다음_시가총액: number = Number(nextMarketInfo["시가총액"]);
            // console.log(`현재_종가`, 현재_시가총액, `-> 다음_종가`, 다음_시가총액);
            수익률 = (다음_시가총액 - 현재_시가총액) / 다음_시가총액;
          }
        }
        종목수++;

        // console.log(`수익률`, 수익률);
        누적_수익률 += 수익률;
      }
      const 평균_수익률: number = 누적_수익률 / 종목수;
      최종_수익금 = 최종_수익금 * (1 + 평균_수익률);
      let newLog = [];
      newLog.push(`매수${curDate}~매도${nextDate}`);
      newLog.push(`${최종_수익금.toFixed(0)}`);
      newLog.push(`${평균_수익률.toFixed(4)}`);
      newLog.push(`${종목수}`);
      // console.log(newLog);
      logList.push(newLog);
    }
    props.setBackTestResultLog([...logList]);

    setStocks([...mergedSelectedStockNameList]);
  };
  return (
    <>
      <Navbar>
        <ListItem className={`flex items-center w-full text-black p-0 m-0`}>
          <ListItemPrefix>
            <div onClick={() => {
              props.setOpenedPanel("");
              props.setBackTestResultLog([]);
            }}>
              <ArrowUturnLeftIcon className="h-6 w-6" />
            </div>
          </ListItemPrefix>
          <div className="w-full text-center pr-10 text-lg">백테스트</div>
        </ListItem>
      </Navbar>
      <div className="flex py-1 gap-3">
        <Chip className="bg-white border-none text-black" value={`원금: ${principal} 원`} />
        <Button className="p-0 px-2" onClick={() => getNCAV()}>run backtest </Button>
        <Switch color="green" label="종목 표시" onClick={(e) => {
          const target: any = e.target;

          setShowStocks(target.checked);
        }} />
      </div>

      <Timeline>
        {
          props.backTestResultLog.map((item, idx) => {
            const isLastItem = Object.keys(props.backTestResultLog).length - 1 == idx;
            // const isLastItem = false;
            console.log(`isLastItem`, isLastItem);
            return (
              <>
                <TimelineItem className={`${showStocks ? "h-52" : "h-32"}`}>
                  {isLastItem ? <></> : <TimelineConnector className="!w-[78px]" />
                  }
                  <TimelineHeader className={`relative rounded-xl border border-blue-gray-50 ${isLastItem ? "bg-red-50" : "bg-white"}  ${item[2] < 0 ? "" : "border-red-200 border-2"} py-3 pl-4 pr-6 shadow-lg shadow-blue-gray-900/5`}>
                    <TimelineIcon className="p-3" variant="ghost" color="green">
                      <CurrencyDollarIcon className="h-5 w-5" />
                    </TimelineIcon>
                    <div className="flex flex-col gap-1 w-full">
                      <Typography variant="h5" color="blue-gray">
                        {item[0]}
                      </Typography>
                      <Typography variant="h6" color="gray" className="font-normal">
                        {item[1]} 원 | {item[2] * 100} % | {item[3]}개 종목
                        {
                          showStocks ?
                            <div className="text-xs font-normal overflow-y-auto h-20">
                              {stocks[idx].map((item) => { return item + '|' })}
                            </div>
                            :
                            <></>
                        }
                      </Typography>

                    </div>
                  </TimelineHeader>
                </TimelineItem >
              </>
            )
          })
        }
      </Timeline >
    </>
  );
}
