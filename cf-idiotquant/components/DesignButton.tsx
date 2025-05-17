import React from 'react';

export interface DesignButtonProps {
    handleOnClick: () => void;
    buttonName: React.ReactNode;
    buttonBgColor: string; // bg-green-400
    buttonBorderColor: string; // border-green-300
    buttonShadowColor: string; // #129600
    buttonStyle?: string;
    textStyle?: string;
    additionalTextTop?: React.ReactNode;
    additionalTextBottom?: React.ReactNode;
}

export const DesignButton: React.FC<DesignButtonProps> = ({
    handleOnClick,
    buttonBgColor,
    buttonShadowColor,
    buttonBorderColor,
    buttonStyle,
    additionalTextTop,
    additionalTextBottom,
    textStyle,
    buttonName,
}) => {
    return (
        <div
            onClick={handleOnClick}
            className={`flex items-center justify-center mb-2 button ${buttonBgColor} rounded-full cursor-pointer select-none
                active:translate-y-1 active:[box-shadow:0_0px_0_0_${buttonShadowColor},0_0px_0_0_${buttonShadowColor}41] active:border-b-[0px]
                transition-all duration-150 [box-shadow:0_4px_0_0_${buttonShadowColor},0_8px_0_0_${buttonShadowColor}41] border-b-[1px] ${buttonBorderColor}
                ${buttonStyle}
            `}
        >
            {additionalTextTop}
            <span className={`justify-center items-center font-mono ${textStyle}`}>{buttonName}</span>
            {additionalTextBottom}
        </div>
    );
}; 