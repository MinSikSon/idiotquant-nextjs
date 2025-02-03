"use client"

import RegisterTemplate from "@/app/(strategy-register)/strategy-register/register_template";
import { GetMergedStocksList, GetStocksFilteredByStrategyNCAV } from "@/components/strategy";
import { GetStocksFilteredByCustom } from "@/components/strategyCustom";
import { Util } from "@/components/util";
import { getDefaultStrategy, getCapitalization, getPbr, getPer, getNetIncome, getNetIncomeList, getStep3Title, getStep3SubTitle, getCapitalizationMin, getCapitalizationMinList } from "@/lib/features/filter/filterSlice";
import { setDefaultStrategy, setCapitalizationMin, setCapitalization, setPer, setPbr, setNetIncome } from "@/lib/features/filter/filterSlice";
import { getDefaultStrategyList, getPerList, getPbrList, getCapitalizationList } from "@/lib/features/filter/filterSlice";
import { getStep0Title, getStep1Title, getStep2Title } from "@/lib/features/filter/filterSlice";
import { getStep0SubTitle, getStep1SubTitle, getStep2SubTitle1, getStep2SubTitle2 } from "@/lib/features/filter/filterSlice";
import { selectFinancialInfo, selectLatestDate } from "@/lib/features/financialInfo/financialInfoSlice";
import { selectMarketInfo } from "@/lib/features/marketInfo/marketInfoSlice";
import { addStrategyList } from "@/lib/features/strategy/strategySlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button, ButtonGroup } from "@material-tailwind/react";
import Link from "next/link";

export default function StrategyRegister() {
    const dispatch = useAppDispatch();

    const financialLatestDate: any = useAppSelector(selectLatestDate);

    const step0Title = useAppSelector(getStep0Title);
    const step0SubTitle = useAppSelector(getStep0SubTitle);
    const step1Title = useAppSelector(getStep1Title);
    const step1SubTitle = useAppSelector(getStep1SubTitle);
    const step2Title = useAppSelector(getStep2Title);
    const step2SubTitle1 = useAppSelector(getStep2SubTitle1);
    const step2SubTitle2 = useAppSelector(getStep2SubTitle2);
    const step3Title = useAppSelector(getStep3Title);
    const step3SubTitle = useAppSelector(getStep3SubTitle);

    const defaultStrategy = useAppSelector(getDefaultStrategy);
    const defaultStrategyList: string[] = useAppSelector(getDefaultStrategyList);
    const per = useAppSelector(getPer);
    const perList: any[] = useAppSelector(getPerList);
    const pbr = useAppSelector(getPbr);
    const pbrList: any[] = useAppSelector(getPbrList);
    const capitalizationMin = useAppSelector(getCapitalizationMin);
    const capitalizationMinList: any[] = useAppSelector(getCapitalizationMinList);
    const capitalization = useAppSelector(getCapitalization);
    const capitalizationList: any[] = useAppSelector(getCapitalizationList);
    const netIncome = useAppSelector(getNetIncome);
    const netIncomeList: boolean[] = useAppSelector(getNetIncomeList);

    const financialInfo: object = useAppSelector(selectFinancialInfo);
    const marketInfo: any = useAppSelector(selectMarketInfo);

    const getTitle = () => {
        return "나만의 투자 전략 만들기";
    }

    const getSubTitle = () => {
        return "";
    }

    const classNameButtonGroup = `flex flex-col justify-between items-left mt-2 text-black hover:text-blue-500`
    const selectedButtonColor = `bg-blue-500 text-white`;
    const getStep0Contents = () => {
        function handleOnclickDefaultStrategy(item: any) {
            dispatch(setDefaultStrategy(item));
        }

        return <div className="flex flex-col">
            <div className={classNameButtonGroup}>
                <div>전략</div>
                <ButtonGroup color="blue" variant="outlined" size="sm" fullWidth>
                    {defaultStrategyList.map((item, key) => <Button key={key} className={defaultStrategy == item ? selectedButtonColor : ``} onClick={() => handleOnclickDefaultStrategy(item)}>{`${item}`}</Button>)}
                </ButtonGroup>
            </div>
            {/* <div className={classNameButtonGroup}>
                    전략 추가 예정
                </div> */}
        </div>
    }

    const getStep1Contents = () => {
        function handleOnclickPer(item: any) {
            // console.log(`setPer`, item);
            dispatch(setPer(item));
        }

        function handleOnclickPbr(item: any) {
            // console.log(`setPbr`, item);
            dispatch(setPbr(item));
        }

        return <div className="flex flex-col">
            <div className={classNameButtonGroup}>
                <div>PER 최대</div>
                <ButtonGroup color="blue" variant="outlined" size="sm" fullWidth>
                    {perList.map((item, key) => <Button key={key} className={per == item ? selectedButtonColor : ``} onClick={() => handleOnclickPer(item)}>{`${item}`}</Button>)}
                </ButtonGroup>
            </div>
            <div className={classNameButtonGroup}>
                <div>PBR 최대</div>
                <ButtonGroup color="blue" variant="outlined" size="sm" fullWidth>
                    {pbrList.map((item, key) => <Button key={key} className={pbr == item ? selectedButtonColor : ``} onClick={() => handleOnclickPbr(item)}>{`${item}`}</Button>)}
                </ButtonGroup>
            </div>
        </div>
    }

    const getStep2Contents = () => {
        function handleOnclickCapitalizationMin(item: any) {
            // console.log(`setCapitalization`, item);
            dispatch(setCapitalizationMin(item));
        }
        function handleOnclickCapitalization(item: any) {
            // console.log(`setCapitalization`, item);
            dispatch(setCapitalization(item));
        }

        return <div className="flex flex-col">
            <div className={classNameButtonGroup}>
                <div>{step2SubTitle1}</div>
                <ButtonGroup color="blue" variant="outlined" size="sm" fullWidth>
                    {capitalizationMinList.map((item, key) => <Button key={key} className={`px-0 ${capitalizationMin == item ? selectedButtonColor : ``}`} onClick={() => handleOnclickCapitalizationMin(item)}>{`${isNaN(item) ? item : Util.UnitConversion(item, true)}`}</Button>)}
                </ButtonGroup>
            </div>
            <div className={classNameButtonGroup}>
                <div>{step2SubTitle2}</div>
                <ButtonGroup color="blue" variant="outlined" size="sm" fullWidth>
                    {capitalizationList.map((item, key) => <Button key={key} className={`px-0 ${capitalization == item ? selectedButtonColor : ``}`} onClick={() => handleOnclickCapitalization(item)}>{`${isNaN(item) ? item : Util.UnitConversion(item, true)}`}</Button>)}
                </ButtonGroup>
            </div>
        </div>
    }

    const getStep3Contents = () => {
        function handleOnclickNetIncome(item: any) {
            // console.log(`setCapitalization`, item);
            dispatch(setNetIncome(item));
        }

        return <div className="flex flex-col">
            <div className={classNameButtonGroup}>
                <div>{step3Title}</div>
                <ButtonGroup color="blue" variant="outlined" size="sm" fullWidth>
                    {netIncomeList.map((item, key) => <Button key={key} className={netIncome == item ? selectedButtonColor : ``} onClick={() => handleOnclickNetIncome(item)}>{String(item)}</Button>)}
                </ButtonGroup>
            </div>
        </div>
    }

    const getContents = () => {
        return <>
            {getStep0Contents()}
            {getStep1Contents()}
            {getStep2Contents()}
            {getStep3Contents()}
        </>
    }

    // const handleOnClick = (isLastStep: boolean) => {
    const handleOnClick = () => {
        // if (false == isLastStep) {
        //     return;
        // }

        // console.log(`handleOnClick`);
        // alert(`기능 추가 예정입니다..!`);

        // return;
        // console.log(`financialInfo`, financialInfo);
        // console.log(`marketInfo`, marketInfo);
        const mergedStockInfo = GetMergedStocksList(financialInfo, marketInfo);
        // console.log(`mergedStockInfo`, mergedStockInfo, Object.keys(mergedStockInfo).length);
        // filter: strategy
        let filteredByStrategyStocks: any = {};
        if (defaultStrategy == `NCAV`) {
            filteredByStrategyStocks = GetStocksFilteredByStrategyNCAV(mergedStockInfo)
        }
        else {
            filteredByStrategyStocks = mergedStockInfo;
        }
        // console.log(`defaultStrategy`, defaultStrategy, filteredByStrategyStocks, Object.keys(filteredByStrategyStocks).length);

        console.log(`capitalizationMin`, capitalizationMin);
        console.log(`netIncome`, netIncome);
        // filter: stock information
        const filteredStocks = GetStocksFilteredByCustom(filteredByStrategyStocks, ["PER", "PBR", "시가총액최소값", "시가총액", "당기순이익"], [per, pbr, capitalizationMin, capitalization, netIncome]);
        console.log(`filteredStocks`, filteredStocks, Object.keys(filteredStocks).length);

        const filterOption: string = `전략:${defaultStrategy}, PER:${per}, PBR:${pbr}, 시가총액:${isNaN(capitalizationMin) ? capitalizationMin : Util.UnitConversion(capitalizationMin, true)}~${isNaN(capitalization) ? capitalization : Util.UnitConversion(capitalization, true)}`;
        const { year, quarter } = financialLatestDate;
        const newStrategyList: any = {
            title: `(custom) base: ${defaultStrategy}`,
            subTitle: `종목수: ${Object.keys(filteredStocks).length}`,
            desc: filterOption,
            financialInfoDate: `${year}${quarter}Q`,
            marketInfoDate: marketInfo[`date`],
            ncavList: JSON.stringify(filteredStocks)
        }
        console.log(`newStrategyList`, newStrategyList);
        dispatch(addStrategyList(newStrategyList));
    }

    return <>
        <RegisterTemplate
            cardBodyFix={true}
            title={getTitle()}
            subTitle={getSubTitle()}
            content={getContents()}
            footer={
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <Link href={`/`}>
                            <Button color="red" size="sm" variant="outlined">
                                {/* prev */}
                                취소
                            </Button>
                        </Link>
                        <Link href={`/`}>
                            <Button className="hover:text-blue-500 hover:border-blue-500" color={`black`} onClick={() => handleOnClick()} size="sm" variant="outlined">
                                등록
                            </Button>
                        </Link>
                    </div>
                </div>
            }
        />
    </>
}

export const runtime = 'edge'