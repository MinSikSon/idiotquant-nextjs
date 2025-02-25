
export interface DesignButtonProps {
    handleOnClick: () => void;
    buttonName: string;
    buttonBgColor: string; // bg-green-400
    buttonBorderColor: string; // border-green-300
    buttonShadowColor: string; // #129600
    buttonStyle?: string;
    textStyle?: string;
    additionalTextTop?: any;
    additionalTextBottom?: any;
}
export const DesignButton = (props: DesignButtonProps) => {
    return <div
        onClick={props.handleOnClick}
        className={`flex items-center justify-center mb-2 px-1 button ${props.buttonBgColor} rounded-full cursor-pointer select-none
active:translate-y-1 active:[box-shadow:0_0px_0_0_${props.buttonShadowColor},0_0px_0_0_${props.buttonShadowColor}41] active:border-b-[0px]
transition-all duration-150 [box-shadow:0_4px_0_0_${props.buttonShadowColor},0_8px_0_0_${props.buttonShadowColor}41] border-b-[1px] ${props.buttonBorderColor}
${props.buttonStyle}
`}>
        {props.additionalTextTop}
        <span className={`flex flex-col justify-center items-center text-white font-mono ${props.textStyle}`}>{props.buttonName}</span>
        {props.additionalTextBottom}
    </div>
}

