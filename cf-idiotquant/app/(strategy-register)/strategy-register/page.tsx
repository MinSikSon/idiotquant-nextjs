"use client"

import { DesignButton } from "@/components/designButton";
import RegisterTemplate from "@/components/register_template";
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

    const financialInfo: any = useAppSelector(selectFinancialInfo);
    const marketInfo: any = useAppSelector(selectMarketInfo);

    const getTitle = () => {
        return "나만의 투자 전략 만들기";
    }

    const getSubTitle = () => {
        return "";
    }

    const getStepContents = (title: string, list: any[], selectValue: any, handleOnClick: any) => {
        return <div className="flex flex-col">
            <div className="flex flex-col justify-between items-left mt-2 text-black hover:text-blue-500">
                <div>{title}</div>
                <ButtonGroup color="blue" variant="outlined" size="sm" fullWidth>
                    {list.map((item, key) => <Button key={key} className={selectValue == item ? `bg-blue-500 text-white` : ``} onClick={() => handleOnClick(item)}>{`${item}`}</Button>)}
                </ButtonGroup>
            </div>
        </div>
    }

    const getStepContentsType2 = (title: string, list: any[], selectValue: any, handleOnClick: any) => {
        return <div className="flex flex-col">
            <div className="flex flex-col justify-between items-left mt-2 text-black hover:text-blue-500">
                <div>{title}</div>
                <ButtonGroup color="blue" variant="outlined" size="sm" fullWidth>
                    {list.map((item, key) => <Button key={key} className={`px-0 ${selectValue == item ? `bg-blue-500 text-white` : ``}`} onClick={() => handleOnClick(item)}>{`${Util.UnitConversion(Number(item), true)}`}</Button>)}
                </ButtonGroup>
            </div>
        </div>
    }

    const getContents = () => {
        return <>
            {getStepContents("전략", defaultStrategyList, defaultStrategy, (item: any) => { dispatch(setDefaultStrategy(item)); })}
            {getStepContents("PER 최대", perList, per, (item: any) => { dispatch(setPer(item)); })}
            {getStepContents("PBR 최대", pbrList, pbr, (item: any) => { dispatch(setPbr(item)); })}
            {getStepContentsType2(step2SubTitle1, capitalizationMinList, capitalizationMin, (item: any) => { dispatch(setCapitalizationMin(item)); })}
            {getStepContentsType2(step2SubTitle2, capitalizationList, capitalization, (item: any) => { dispatch(setCapitalization(item)); })}
            {getStepContents(step3Title, netIncomeList, netIncome, (item: any) => { dispatch(setNetIncome(item)); })}
        </>
    }

    // const handleOnClick = (isLastStep: boolean) => {
    const handleOnClick = () => {
        console.log(`financialInfo`, financialInfo);
        console.log(`marketInfo`, marketInfo);

        const mergedStockInfo = GetMergedStocksList(financialInfo["output"], marketInfo);
        // console.log(`mergedStockInfo`, mergedStockInfo, Object.keys(mergedStockInfo).length);
        // filter: strategy
        let filteredByStrategyStocks: any = {};
        if (defaultStrategy == `NCAV`) {
            filteredByStrategyStocks = GetStocksFilteredByStrategyNCAV(mergedStockInfo)
        }
        else {
            filteredByStrategyStocks = mergedStockInfo;
        }
        console.log(`defaultStrategy`, defaultStrategy, filteredByStrategyStocks, Object.keys(filteredByStrategyStocks).length);

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
                            <DesignButton
                                handleOnClick={() => { }}
                                buttonName="취소"
                                buttonBgColor="bg-red-400"
                                buttonBorderColor="border-red-300"
                                buttonShadowColor="#910000"
                                textStyle="text-white text-xs pt-0.5 font-bold"
                                // buttonStyle="rounded-lg px-4 py-2 ml-2"
                                buttonStyle={`rounded-lg px-4 py-1 ml-2 flex items-center justify-center mb-2 px-1 button bg-red-400 rounded-full cursor-pointer select-none
                                                                        active:translate-y-1 active:[box-shadow:0_0px_0_0_#910000,0_0px_0_0_#91000041] active:border-b-[0px]
                                                                        transition-all duration-150 [box-shadow:0_4px_0_0_#910000,0_8px_0_0_#91000041] border-b-[1px] border-red-300
                                                                        `}
                            />
                        </Link>
                        <Link href={`/`}>
                            <DesignButton
                                handleOnClick={() => handleOnClick()}
                                buttonName="등록"
                                buttonBgColor="bg-green-400"
                                buttonBorderColor="border-green-300"
                                buttonShadowColor="#129600"
                                textStyle="text-white text-xs pt-0.5 font-bold"
                                buttonStyle="rounded-lg px-4 py-1"
                            />
                        </Link>
                    </div>
                </div>
            }
        />
    </>
}

export const runtime = 'edge'