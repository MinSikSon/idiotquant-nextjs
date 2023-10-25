import { Typography } from "@material-tailwind/react";

export default function TitlePanel(props) {
    if (props.openSearchResult) return <></>

    return (
        <div className='py-3 my-2 bg-white'>
            <Typography className="pl-5 pb-1" variant='h4'>
                <div>idiot<span className='text-green-400'>.</span>quant</div>
            </Typography>
        </div>
    );
}