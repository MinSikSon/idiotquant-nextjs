"use client"

import RegisterTemplate from "./register_template";
import { getCapitalization, getPbr, getPer } from "@/lib/features/filter/filterSlice";
import { useSelector } from "react-redux";
import { Util } from "@/components/util";
import { Button } from "@material-tailwind/react";

export default function RegisterStrategy() {
    const per = useSelector(getPer);
    const pbr = useSelector(getPbr);
    const capitalization = useSelector(getCapitalization);

    function handleOnClick() {
        console.log(`handleOnClick`);
    }

    const resultRegistable = 0 != per && 0 != pbr && 0 != capitalization;
    return <>
        <RegisterTemplate
            id={`1`}
            totalStepCount={2}
            title={`선택 결과`}
            subTitle={``}
            content={<>
                <div className="flex flex-col">
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
            </>}
            footer={<>
                <div className="flex justify-between items-center">
                    <Button disabled={!resultRegistable} onClick={handleOnClick} variant="outlined"  >
                        결과 등록
                    </Button>
                </div>
            </>}
        />
    </>
}
