import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button, Checkbox, Chip, ListItem, ListItemPrefix, ListItemSuffix, Typography } from "@material-tailwind/react";
import { Util } from "./Util";

export default function RecentlyViewedStocks(props) {
    if (props.searchPanelIsOpened) return <></>;

    const Item = (props) => {
        return (
            <div className='shrink-0 snap-center flex flex-row bg-gray-200 rounded-lg items-center px-1'>
                <Chip
                    className="border-none pr-1 text-xs text-black"
                    value={`${props.stockName}`}
                    variant="outlined"
                    onClick={() => { props.clickedRecentlyViewedStock(props.stockName) }}
                />
                <div className={`text-xs shrink-0`}>{Util.UnitConversion(props.description, true)}</div>
                {/* <div className={`text-sm ${props.percentage > 0 ? 'text-red-600' : 'text-blue-600'}`}>{props.percentage}%</div> */}
                <XMarkIcon className="h-5 w-5 shrink-0" strokeWidth={2} onClick={() => (props.spliceRecentlyViewedStocksList(props.stockName))} />
            </div>
        );
    }

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // props.recentlyViewedStocksList.map(({ stockName }) => { console.log(props.latestStockCompanyInfo[stockName]); });

    return (
        <div className='py-3 my-2 bg-white'>
            <Typography className="pl-5 pb-2" variant='h6'>최근 본 주식</Typography>
            <div className="pl-5 flex gap-1 overflow-auto snap-x">
                {props.recentlyViewedStocksList.length > 0 ?
                    props.recentlyViewedStocksList.map(({ stockName }) => (<Item
                        stockName={stockName}
                        description={props.latestStockCompanyInfo[stockName]['종가']}
                        clickedRecentlyViewedStock={props.clickedRecentlyViewedStock}

                        spliceRecentlyViewedStocksList={props.spliceRecentlyViewedStocksList}
                    />))
                    :
                    <Typography variant="small">최근에 본 주식이 없어요</Typography>
                }
            </div>
        </div>
    );
}