import { Typography } from "@material-tailwind/react";

export default function TitlePanel(props) {
    if ('' !== props.openedPanel) return <></>;

    // console.log(`%cTitlePanel ${props.openedPanel}`, 'color:blue; background:white;')
    // console.log(`%c TitlePanel`, `color:blue; background:white`);

    return (
        <div className='my-2 bg-white'>
            <Typography className="pl-5 pb-1" variant='h4'>
                <div>idiot<span className='text-green-400'>.</span>quant</div>
            </Typography>
        </div>
    );
}