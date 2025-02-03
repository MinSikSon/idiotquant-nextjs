"use client"

import RegisterTemplate from "@/app/(strategy-register)/strategy-register/register_template";
import { GetMergedStocksList, GetStocksFilteredByStrategyNCAV } from "@/components/strategy";
import { GetStocksFilteredByCustom } from "@/components/strategyCustom";
import { Util } from "@/components/util";
import { getDefaultStrategy, getCapitalization, getPbr, getPer, getTotalStepCount, getNetIncome, getNetIncomeList, getStep3Title, getStep3SubTitle, setNetIncome, getCapitalizationMin, getCapitalizationMinList } from "@/lib/features/filter/filterSlice";
import { setDefaultStrategy, setCapitalization, setPer, setPbr } from "@/lib/features/filter/filterSlice";
import { getDefaultStrategyList, getPerList, getPbrList, getCapitalizationList } from "@/lib/features/filter/filterSlice";
import { getStep0Title, getStep1Title, getStep2Title } from "@/lib/features/filter/filterSlice";
import { getStep0SubTitle, getStep1SubTitle, getStep2SubTitle1, getStep2SubTitle2 } from "@/lib/features/filter/filterSlice";
import { selectFinancialInfo, selectLatestDate } from "@/lib/features/financialInfo/financialInfoSlice";
import { selectMarketInfo } from "@/lib/features/marketInfo/marketInfoSlice";
import { addStrategyList } from "@/lib/features/strategy/strategySlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button, ButtonGroup } from "@material-tailwind/react";
import Link from "next/link";

export default function Item({ params: { id } }: { params: { id: string } }) {
    const dispatch = useAppDispatch();

    const financialLatestDate: any = useAppSelector(selectLatestDate);

    const totalStepCount = useAppSelector(getTotalStepCount);

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

    const getTitle = (id: number) => {
        // if (id === 0) {
        //     return step0Title;
        // } else if (id === 1) {
        //     return step1Title;
        // } else if (id === 2) {
        //     return step2Title;
        // } else {
        //     return "Invalid id";
        // }

        return "나만의 투자 전략 만들기";
    }

    const getSubTitle = (id: number) => {
        // if (id === 0) {
        //     return step0SubTitle;
        // } else if (id === 1) {
        //     return step1SubTitle;
        // } else if (id === 2) {
        //     return step2SubTitle;
        // } else {
        //     return "Invalid id";
        // }

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
        function handleOnclickCapitalization(item: any) {
            // console.log(`setCapitalization`, item);
            dispatch(setCapitalization(item));
        }

        return <div className="flex flex-col">
            <div className={classNameButtonGroup}>
                <div>{step2SubTitle1}</div>
                <ButtonGroup color="blue" variant="outlined" size="sm" fullWidth>
                    {capitalizationMinList.map((item, key) => <Button key={key} className={`px-0 ${capitalizationMin == item ? selectedButtonColor : ``}`} onClick={() => handleOnclickCapitalization(item)}>{`${isNaN(item) ? item : Util.UnitConversion(item, true)}`}</Button>)}
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

    const getContents = (id: number) => {
        // if (id === 0) {
        //     return getStep0Contents();
        // } else if (id === 1) {
        //     return getStep1Contents();
        // } else if (id === 2) {
        //     return getStep2Contents();
        // } else {
        //     return <div>Invalid id</div>;
        // }

        return <>
            {getStep0Contents()}
            {getStep1Contents()}
            {getStep2Contents()}
            {getStep3Contents()}
        </>
    }
    const handleOnClick = (isLastStep: boolean) => {
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

        console.log(`netIncome`, netIncome);
        // filter: stock information
        const filteredStocks = GetStocksFilteredByCustom(filteredByStrategyStocks, ["PER", "PBR", "시가총액", "당기순이익"], [per, pbr, capitalization, netIncome]);
        // console.log(`filteredStocks`, filteredStocks, Object.keys(filteredStocks).length);

        const { year, quarter } = financialLatestDate;
        const newStrategyList: any = {
            title: `(custom) base: ${defaultStrategy}`,
            subTitle: `PER:${per}, PBR:${pbr}, 시가총액:${isNaN(capitalization) ? capitalization : Util.UnitConversion(capitalization, true)}`,
            desc: `custom filter`,
            financialInfoDate: `${year}${quarter}Q`,
            marketInfoDate: marketInfo[`date`],
            ncavList: JSON.stringify(filteredStocks)
        }
        // console.log(`newStrategyList`, newStrategyList);
        dispatch(addStrategyList(newStrategyList));
    }

    const isLastStep = (Number(id) + 1) == totalStepCount;
    const allSelected = 0 != per && 0 != pbr && 0 != capitalization;

    // console.log(`isLastStep`, isLastStep);
    return <>
        <RegisterTemplate
            cardBodyFix={true}
            id={decodeURI(id)}
            totalStepCount={totalStepCount}
            title={getTitle(Number(id))}
            subTitle={getSubTitle(Number(id))}
            content={getContents(Number(id))}
            footer={
                <div className="flex flex-col gap-2">
                    {/* <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                            <div>
                                기본 전략: {defaultStrategy}
                            </div>
                            <div>
                                PER: {per}
                            </div>
                            <div>
                                PBR: {pbr}
                            </div>
                            <div>
                                시가총액: {isNaN(capitalization) ? capitalization : Util.UnitConversion(capitalization, true)}
                            </div>
                        </div>
                    </div> */}
                    <div className="flex justify-between items-center">
                        <Link href={0 == Number(id) ? `/` : `/strategy-register/${Number(id) - 1}`}>
                            <Button color="red" size="sm" variant="outlined">
                                {/* prev */}
                                취소
                            </Button>
                        </Link>

                        {/* {false == isLastStep || allSelected ?
                            <Link href={(true == isLastStep) ? `/` : `/strategy-register/${Number(id) + 1}`}>
                                <Button color={(true == isLastStep) ? `blue` : `gray`} onClick={() => handleOnClick(isLastStep)} size="sm" variant="outlined">
                                    {(true == isLastStep) ? `complete` : `next`}
                                </Button>
                            </Link>
                            :
                            <Button disabled color={(true == isLastStep) ? `blue` : `gray`} onClick={() => handleOnClick(isLastStep)} size="sm" variant="outlined">
                                {(true == isLastStep) ? `complete` : `next`}
                            </Button>
                        } */}
                        <Link href={`/`}>
                            <Button className="hover:text-blue-500 hover:border-blue-500" color={`black`} onClick={() => handleOnClick(isLastStep)} size="sm" variant="outlined">
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