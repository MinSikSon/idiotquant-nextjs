"use client"

import RegisterTemplate from "@/app/(strategy_register)/strategy_register/register_template";
import { Util } from "@/components/util";
import { getCapitalization, getPbr, getPer, getTotalStepCount } from "@/lib/features/filter/filterSlice";
import { setCapitalization, setPer, setPbr } from "@/lib/features/filter/filterSlice";
import { getPerList, getPbrList, getCapitalizationList } from "@/lib/features/filter/filterSlice";
import { getStep0Title, getStep1Title } from "@/lib/features/filter/filterSlice";
import { getStep0SubTitle, getStep1SubTitle } from "@/lib/features/filter/filterSlice";
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
    const per = useAppSelector(getPer);
    const perList: number[] = useAppSelector(getPerList);
    const pbr = useAppSelector(getPbr);
    const pbrList: number[] = useAppSelector(getPbrList);
    const capitalization = useAppSelector(getCapitalization);
    const capitalizationList: number[] = useAppSelector(getCapitalizationList);

    const getTitle = (id: number) => {
        if (id === 0) {
            return step0Title;
        } else if (id === 1) {
            return step1Title;
        } else {
            return "Invalid id";
        }
    }

    const getSubTitle = (id: number) => {
        if (id === 0) {
            return step0SubTitle;
        } else if (id === 1) {
            return step1SubTitle;
        } else {
            return "Invalid id";
        }
    }

    const selectedButtonColor = `bg-black text-white`;

    const getStep0Contents = () => {
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
                <div className="flex justify-between items-center">
                    <div>PER</div>
                    <ButtonGroup variant="outlined" size="sm">
                        {perList.map((item) => <Button className={per == item ? selectedButtonColor : ``} onClick={() => handleOnclickPer(item)}>{`< ${item}`}</Button>)}
                    </ButtonGroup>
                </div>
                <div className="flex justify-between items-center">
                    <div>PBR</div>
                    <ButtonGroup variant="outlined" size="sm">
                        {pbrList.map((item) => <Button className={pbr == item ? selectedButtonColor : ``} onClick={() => handleOnclickPbr(item)}>{`< ${item}`}</Button>)}
                    </ButtonGroup>
                </div>
            </div>
        </>
    }
    const getStep1Contents = () => {
        function handleOnclickCapitalization(item: any) {
            // console.log(`setCapitalization`, item);
            dispatch(setCapitalization(item));
        }

        return <>
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <div>{step1Title}</div>
                    <ButtonGroup variant="outlined" size="sm">
                        {capitalizationList.map((item) => <Button className={capitalization == item ? selectedButtonColor : ``} onClick={() => handleOnclickCapitalization(item)}>{`< ${Util.UnitConversion(item, true)}`}</Button>)}
                    </ButtonGroup>
                </div>
            </div>
        </>
    }

    const getContents = (id: number) => {
        if (id === 0) {
            return getStep0Contents();
        } else if (id === 1) {
            return getStep1Contents();
        } else {
            return <div>Invalid id</div>;
        }
    }
    return <RegisterTemplate
        id={decodeURI(id)}
        totalStepCount={totalStepCount}
        title={getTitle(Number(id))}
        subTitle={getSubTitle(Number(id))}
        content={getContents(Number(id))}
        footer={<>
            <Link href={0 == Number(id) ? `/` : `/strategy_register/${Number(id) - 1}`}>
                <Button size="sm" variant="outlined">
                    prev
                </Button>
            </Link>
            <Link href={(Number(id) + 1) == totalStepCount ? `/strategy_register` : `/strategy_register/${Number(id) + 1}`}>
                <Button size="sm" variant="outlined">
                    {(Number(id) + 1) == totalStepCount ? `complete` : `next`}
                </Button>
            </Link>
        </>}
    />
}