import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button, Checkbox, Chip, ListItem, ListItemPrefix, ListItemSuffix, Typography } from "@material-tailwind/react";

export default function RecentlyViewedStocks(props) {
    if (props.openSearchResult) return <></>;

    const Item = (props) => {
        return (
            <div className='snap-center flex flex-row bg-gray-200 rounded-lg items-center px-1'>
                <Chip className="border-none pr-1" value={`${props.stockName}`} variant="outlined" size="lg" onClick={() => { console.log(`clicked Chip`) }} />
                <div className={`text-sm ${props.percentage > 0 ? 'text-red-600' : 'text-blue-600'}`}>{props.percentage}%</div>
                <XMarkIcon strokeWidth={2} className="h-5 w-5" onClick={() => { console.log(`clicked XMarkIcon`) }} />
            </div>
        );
    }

    return (
        <div className='py-3 my-2 bg-white'>
            <Typography className="pl-5 pb-2" variant='h6'>최근 본 주식</Typography>
            <div className="pl-5 flex gap-1 overflow-auto snap-x">
                <Item stockName="실험실" percentage="100" />
                <Item stockName="삼성전자" percentage="3" />
                <Item stockName="삼양통상" percentage="-3" />
                <Item stockName="삼정펄프" percentage="2.4" />
                <Item stockName="카카오" percentage="-0.5" />
            </div>
        </div>
    );
}