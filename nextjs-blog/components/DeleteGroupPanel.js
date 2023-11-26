import { ArrowUturnLeftIcon, TrashIcon } from "@heroicons/react/24/outline";
import { List, ListItem, ListItemPrefix, ListItemSuffix, Navbar } from "@material-tailwind/react";
import React from "react";

export default function DeleteGroupPanel(props) {
    return <>
        <Navbar>
            <ListItem className={`flex items-center w-full text-black p-0 m-0`}>
                <ListItemPrefix>
                    <div onClick={() => props.setOpenedPanel('StocksOfInterestPanel')}>
                        <ArrowUturnLeftIcon className="h-6 w-6" />
                    </div>
                </ListItemPrefix>
                <div className="w-full text-center pr-10 text-lg">그룹 제거</div>
            </ListItem>
        </Navbar>
        <List className="bg-gray-100">
            {props.stocksOfInterest.tabs.map((item, idx) => {
                // console.log(`idx:`, idx, `, item`, item);
                return <ListItem key={idx}>
                    <ListItemPrefix>
                        {item.label} ({item.stocks.length})
                    </ListItemPrefix>
                    <ListItemSuffix>
                        {idx < 2 ?
                            <></> :
                            <button onClick={() => props.handleDeleteStockGroup(idx)}>
                                <TrashIcon className="h-6 w-6" />
                            </button>
                        }
                    </ListItemSuffix>
                </ListItem>
            })}
        </List>
    </>
}