"use client"

import RegisterTemplate from "@/app/(strategy_register)/strategy_register/register_template";
import { GetMergedStocksList } from "@/components/strategy";
import { GetStocksFilteredByCustom } from "@/components/strategyCustom";
import { Util } from "@/components/util";
import { getDefaultStrategy, getCapitalization, getPbr, getPer, getTotalStepCount } from "@/lib/features/filter/filterSlice";
import { setDefaultStrategy, setCapitalization, setPer, setPbr } from "@/lib/features/filter/filterSlice";
import { getDefaultStrategyList, getPerList, getPbrList, getCapitalizationList } from "@/lib/features/filter/filterSlice";
import { getStep0Title, getStep1Title, getStep2Title } from "@/lib/features/filter/filterSlice";
import { getStep0SubTitle, getStep1SubTitle, getStep2SubTitle } from "@/lib/features/filter/filterSlice";
import { selectFinancialInfo, selectFinancialInfoList } from "@/lib/features/financialInfo/financialInfoSlice";
import { selectMarketInfo } from "@/lib/features/marketInfo/marketInfoSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button, ButtonGroup } from "@material-tailwind/react";
import Link from "next/link";

export default function Item({ params: { id } }: { params: { id: string } }) {
    const dispatch = useAppDispatch();
    const totalStepCount = useAppSelector(getTotalStepCount);

    const step0Title = useAppSelector(getStep0Title);
    const step0SubTitle = useAppSelector(getStep0SubTitle);
    const step1Title = useAppSelector(getStep1Title);
    const step1SubTitle = useAppSelector(getStep1SubTitle);
    const step2Title = useAppSelector(getStep2Title);
    const step2SubTitle = useAppSelector(getStep2SubTitle);

    const defaultStrategy = useAppSelector(getDefaultStrategy);
    const defaultStrategyList: string[] = useAppSelector(getDefaultStrategyList);
    const per = useAppSelector(getPer);
    const perList: number[] = useAppSelector(getPerList);
    const pbr = useAppSelector(getPbr);
    const pbrList: number[] = useAppSelector(getPbrList);
    const capitalization = useAppSelector(getCapitalization);
    const capitalizationList: number[] = useAppSelector(getCapitalizationList);

    const financialInfo: object = useAppSelector(selectFinancialInfo);
    // const financialInfoList: string[] = useAppSelector(selectFinancialInfoList);
    const marketInfo: any = useAppSelector(selectMarketInfo);

    const getTitle = (id: number) => {
        if (id === 0) {
            return step0Title;
        } else if (id === 1) {
            return step1Title;
        } else if (id === 2) {
            return step2Title;
        } else {
            return "Invalid id";
        }
    }

    const getSubTitle = (id: number) => {
        if (id === 0) {
            return step0SubTitle;
        } else if (id === 1) {
            return step1SubTitle;
        } else if (id === 2) {
            return step2SubTitle;
        } else {
            return "Invalid id";
        }
    }

    const classNameButtonGroup = `flex justify-between items-center h-10`
    const selectedButtonColor = `bg-black text-white`;
    const getStep0Contents = () => {
        function handleOnclickDefaultStrategy(item: any) {
            dispatch(setDefaultStrategy(item));
        }

        return <>
            <div className="flex flex-col gap-2">
                <div className={classNameButtonGroup}>
                    <div>전략</div>
                    <ButtonGroup variant="outlined" size="sm">
                        {defaultStrategyList.map((item, key) => <Button key={key} className={defaultStrategy == item ? selectedButtonColor : ``} onClick={() => handleOnclickDefaultStrategy(item)}>{`${item}`}</Button>)}
                    </ButtonGroup>
                </div>
                <div className={classNameButtonGroup}>
                </div>
            </div>
        </>
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

        return <>
            <div className="flex flex-col gap-2">
                <div className={classNameButtonGroup}>
                    <div>PER</div>
                    <ButtonGroup variant="outlined" size="sm">
                        {perList.map((item, key) => <Button key={key} className={per == item ? selectedButtonColor : ``} onClick={() => handleOnclickPer(item)}>{`< ${item}`}</Button>)}
                    </ButtonGroup>
                </div>
                <div className={classNameButtonGroup}>
                    <div>PBR</div>
                    <ButtonGroup variant="outlined" size="sm">
                        {pbrList.map((item, key) => <Button key={key} className={pbr == item ? selectedButtonColor : ``} onClick={() => handleOnclickPbr(item)}>{`< ${item}`}</Button>)}
                    </ButtonGroup>
                </div>
            </div>
        </>
    }

    const getStep2Contents = () => {
        function handleOnclickCapitalization(item: any) {
            // console.log(`setCapitalization`, item);
            dispatch(setCapitalization(item));
        }

        return <>
            <div className="flex flex-col gap-2">
                <div className={classNameButtonGroup}>
                    <div>{step2Title}</div>
                    <ButtonGroup variant="outlined" size="sm">
                        {capitalizationList.map((item, key) => <Button key={key} className={capitalization == item ? selectedButtonColor : ``} onClick={() => handleOnclickCapitalization(item)}>{`< ${Util.UnitConversion(item, true)}`}</Button>)}
                    </ButtonGroup>
                </div>
                <div className={classNameButtonGroup}>
                </div>
            </div>
        </>
    }

    const getContents = (id: number) => {
        if (id === 0) {
            return getStep0Contents();
        } else if (id === 1) {
            return getStep1Contents();
        } else if (id === 2) {
            return getStep2Contents();
        } else {
            return <div>Invalid id</div>;
        }
    }
    const handleOnClick = (isLastStep: boolean) => {
        if (true == isLastStep) {
            // console.log(`handleOnClick`);
            alert(`기능 추가 예정입니다..!`);

            // return;
            const mergedStockInfo = GetMergedStocksList(financialInfo, marketInfo);
            console.log(`mergedStockInfo`, mergedStockInfo, Object.keys(mergedStockInfo).length);
            // filter: strategy

            // filter: stock information
            const filteredStocks = GetStocksFilteredByCustom(mergedStockInfo, ["PER", "PBR", "시가총액"], [per, pbr, capitalization]);
            console.log(`filteredStocks`, filteredStocks, Object.keys(filteredStocks).length);
        }
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
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                            <div>
                                기본 전략: {defaultStrategy}
                            </div>
                            <div>
                                PER: {per} 이하
                            </div>
                            <div>
                                PBR: {pbr} 이하
                            </div>
                            <div>
                                시가총액: {Util.UnitConversion(capitalization, true)} 이하
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <Link href={0 == Number(id) ? `/` : `/strategy_register/${Number(id) - 1}`}>
                            <Button size="sm" variant="outlined">
                                prev
                            </Button>
                        </Link>

                        {false == isLastStep || allSelected ?
                            <Link href={(true == isLastStep) ? `/` : `/strategy_register/${Number(id) + 1}`}>
                                <Button color={(true == isLastStep) ? `blue` : `gray`} onClick={() => handleOnClick(isLastStep)} size="sm" variant="outlined">
                                    {(true == isLastStep) ? `complete` : `next`}
                                </Button>
                            </Link>
                            :
                            <Button disabled color={(true == isLastStep) ? `blue` : `gray`} onClick={() => handleOnClick(isLastStep)} size="sm" variant="outlined">
                                {(true == isLastStep) ? `complete` : `next`}
                            </Button>
                        }

                    </div>
                </div>
            }
        />
    </>
}

export const runtime = 'edge'